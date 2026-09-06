#!/usr/bin/env node
/**
 * Build a slug→pageId lockfile using notion-utils' real getCanonicalPageId.
 *
 * Only rows whose parent is the Resources data source (the collection behind
 * the /resources page) are emitted. Pages that were moved out of the catalog
 * — e.g. into the "🗑️ Removed from /resources catalog" page — still travel
 * along in the record map (their ancestors are loaded with the page), and
 * before this filter they leaked into the lockfile and therefore into the
 * sitemap (issue #126, A4: KFC Foundation d9d66201d6024abab081a410bb7b0463).
 *
 * Sources (first argument):
 *   <path.html>   a saved /resources HTML — reads its __NEXT_DATA__
 *   <https://…>   a URL to fetch that HTML from (sends a real User-Agent)
 *   --notion      fetch the record map straight from Notion via notion-client
 *                 (unauthenticated, same call the site makes; a real
 *                 User-Agent is required — Notion 403s the default "node")
 *
 * Usage:
 *   node scripts/build-slug-lockfile.mjs <source> <out.json>
 *   node scripts/build-slug-lockfile.mjs https://techempower.org/resources lib/data/resource-slug-lockfile.json
 *   node scripts/build-slug-lockfile.mjs --notion lib/data/resource-slug-lockfile.json
 *
 * Prints the rows it skipped (and why) plus a diff against the existing
 * lockfile so a refresh can be reviewed before it is committed.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { getCanonicalPageId } from 'notion-utils'

// Keep in sync with RESOURCES_PAGE in lib/page-ids.ts (this script is plain
// ESM so it cannot import the TypeScript constant directly).
const RESOURCES_PAGE = '2a3d706803c649409e74e9ce5ccd4c4b'

// Same UA lib/notion-api.ts uses: Notion's edge (and some CDNs) 403 the
// default Node fetch User-Agent "node".
const USER_AGENT =
  'Mozilla/5.0 (compatible; TechEMPOWER.org; +https://techempower.org)'

const [source, outPath] = process.argv.slice(2)
if (!source || !outPath) {
  console.error(
    'usage: build-slug-lockfile.mjs <resources.html | https://…/resources | --notion> <out.json>'
  )
  process.exit(2)
}

const normalizeId = (id) => (id ?? '').replaceAll('-', '')
// Notion double-wraps records (`{ value: { value, role } }`); older payloads
// are flat (`{ role, value }`). Resolve either.
const recordValue = (wrapper) => wrapper?.value?.value ?? wrapper?.value

function recordMapFromHtml(html, label) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s
  )
  if (!match) {
    console.error(`No __NEXT_DATA__ found in ${label}`)
    process.exit(1)
  }
  const data = JSON.parse(match[1])
  const recordMap = data?.props?.pageProps?.recordMap
  if (!recordMap?.block) {
    console.error(`No recordMap.block found in ${label}`)
    process.exit(1)
  }
  return recordMap
}

async function loadRecordMap() {
  if (source === '--notion') {
    const { NotionAPI } = await import('notion-client')
    const notion = new NotionAPI({
      ofetchOptions: { headers: { 'user-agent': USER_AGENT } }
    })
    return notion.getPage(RESOURCES_PAGE)
  }
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' }
    })
    if (!res.ok) {
      console.error(`GET ${source} → HTTP ${res.status}`)
      process.exit(1)
    }
    return recordMapFromHtml(await res.text(), source)
  }
  return recordMapFromHtml(readFileSync(source, 'utf8'), source)
}

/**
 * The collection id of the Resources data source: read it off the /resources
 * page block (`collection_view_page` / `collection_view` carry
 * `collection_id`). Fall back to a collection literally named "Resources".
 */
function findResourcesCollectionId(recordMap) {
  for (const [id, wrapper] of Object.entries(recordMap.block)) {
    if (normalizeId(id) !== RESOURCES_PAGE) continue
    const collectionId = recordValue(wrapper)?.collection_id
    if (collectionId) return normalizeId(collectionId)
  }
  for (const [id, wrapper] of Object.entries(recordMap.collection ?? {})) {
    const name = recordValue(wrapper)?.name?.[0]?.[0]
    if (name === 'Resources') return normalizeId(id)
  }
  return undefined
}

const recordMap = await loadRecordMap()
const collectionId = findResourcesCollectionId(recordMap)
if (!collectionId) {
  console.error(
    `Could not find the Resources collection: no block ${RESOURCES_PAGE} with a collection_id and no collection named "Resources"`
  )
  process.exit(1)
}
console.log(`Resources collection: ${collectionId}`)

const lockfile = {}
const skipped = []
let count = 0
for (const [bid, wrapper] of Object.entries(recordMap.block)) {
  const v = recordValue(wrapper)
  if (!v || v.type !== 'page') continue
  const title = v.properties?.title?.[0]?.[0] ?? '(untitled)'
  // Rows in the trash are `alive: false`; Notion rarely returns them but be
  // explicit rather than sitemap a deleted page.
  if (v.alive === false) {
    skipped.push({ bid, title, reason: 'not alive' })
    continue
  }
  // Only direct rows of the Resources data source. Anything else that rides
  // along (the root page, ancestors, sub-pages of the "Removed" page, rows of
  // other databases such as Guides) is not a resource.
  if (
    v.parent_table !== 'collection' ||
    normalizeId(v.parent_id) !== collectionId
  ) {
    skipped.push({
      bid,
      title,
      reason: `parent ${v.parent_table}:${normalizeId(v.parent_id)}`
    })
    continue
  }
  // notion-utils helper. Pass uuid:false so we get the friendly slug.
  const slug = getCanonicalPageId(bid, recordMap, { uuid: false })
  if (!slug) continue
  lockfile['/' + slug] = normalizeId(bid)
  count++
}

if (skipped.length > 0) {
  console.log(`skipped ${skipped.length} page block(s) not in the collection:`)
  for (const s of skipped) {
    console.log(`  - ${normalizeId(s.bid)}  ${s.title}  [${s.reason}]`)
  }
}

if (existsSync(outPath)) {
  const previous = JSON.parse(readFileSync(outPath, 'utf8'))
  const added = Object.keys(lockfile).filter((k) => !(k in previous))
  const removed = Object.keys(previous).filter((k) => !(k in lockfile))
  const moved = Object.keys(lockfile).filter(
    (k) => k in previous && previous[k] !== lockfile[k]
  )
  console.log(
    `diff vs ${outPath}: +${added.length} added, -${removed.length} removed, ~${moved.length} re-pointed`
  )
  for (const k of added) console.log(`  + ${k}`)
  for (const k of removed) console.log(`  - ${k}  (${previous[k]})`)
  for (const k of moved)
    console.log(`  ~ ${k}  ${previous[k]} → ${lockfile[k]}`)
}

// Stable output: sort keys so refreshes produce reviewable diffs.
const sorted = Object.fromEntries(
  Object.entries(lockfile).sort(([a], [b]) => a.localeCompare(b))
)
writeFileSync(outPath, JSON.stringify(sorted, null, 2) + '\n')
console.log(`wrote ${count} entries → ${outPath}`)
