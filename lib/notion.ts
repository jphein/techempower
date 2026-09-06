import {
  type ExtendedRecordMap,
  type SearchParams,
  type SearchResults
} from 'notion-types'

import { getTweetsMap } from './get-tweets'
import { notion } from './notion-api'

/**
 * Resolve human-readable property names to their opaque Notion schema IDs
 * (e.g. "Category" → "\\rez") by scanning the first collection's schema.
 * Names are matched case-insensitively and trimmed, so "Value" matches the
 * real schema name "Value " (trailing space). Returns the IDs in the order
 * the names were requested, skipping any that don't resolve.
 */
const resolveGalleryPropertyIds = (
  recordMap: ExtendedRecordMap,
  names: string[]
): string[] => {
  const wanted = new Map(names.map((n) => [n.trim().toLowerCase(), n]))
  const nameToId = new Map<string, string>()

  for (const collectionData of Object.values(recordMap.collection ?? {})) {
    const schema =
      (collectionData as any)?.value?.value?.schema ??
      (collectionData as any)?.value?.schema
    if (!schema) continue
    for (const [propId, propDef] of Object.entries(
      schema as Record<string, any>
    )) {
      const key = (propDef?.name ?? '').trim().toLowerCase()
      if (key && wanted.has(key) && !nameToId.has(key)) {
        nameToId.set(key, propId)
      }
    }
  }

  return names.flatMap((n) => {
    const id = nameToId.get(n.trim().toLowerCase())
    return id ? [id] : []
  })
}

/** Parse category values from a Notion block's properties */
const getBlockCategories = (
  allBlocks: Record<string, any>,
  categoryPropId: string,
  blockId: string
): string[] => {
  const block = allBlocks[blockId]
  if (!block?.properties?.[categoryPropId]) return []
  const raw = block.properties[categoryPropId]
  // Format: [["Food,Senior"]] — comma-separated multi_select
  if (
    Array.isArray(raw) &&
    raw.length > 0 &&
    Array.isArray(raw[0]) &&
    raw[0].length > 0
  ) {
    return (raw[0][0] as string).split(',').map((s: string) => s.trim())
  }
  return []
}

/** Evaluate whether a block matches the collection view filter */
const blockMatchesFilter = (
  allBlocks: Record<string, any>,
  categoryPropId: string,
  topFilter: any,
  outerFilters: any[],
  blockId: string
): boolean => {
  const categories = getBlockCategories(allBlocks, categoryPropId, blockId)
  const outerOp = topFilter.operator || 'or'

  const groupResults = outerFilters.map((group: any) => {
    const inner: any[] = group.filters || []
    const innerOp = group.operator || 'and'

    const innerResults = inner.map((f: any) => {
      if (f.property !== categoryPropId) return true // ignore non-category filters
      const op = f.filter?.operator
      if (op === 'enum_contains') {
        const target = f.filter?.value?.value
        return categories.includes(target)
      }
      if (op === 'is_not_empty') {
        return categories.length > 0
      }
      return true // unknown operator — don't exclude
    })

    return innerOp === 'and'
      ? innerResults.every(Boolean)
      : innerResults.some(Boolean)
  })

  return outerOp === 'and'
    ? groupResults.every(Boolean)
    : groupResults.some(Boolean)
}

export interface GetPageOptions {
  collectionReducerLimit?: number
  /** Inject a client-side load-more limit into every collection view. */
  collectionLoadLimit?: number
  /** Force gallery views to show page covers (or empty placeholders). */
  enableGalleryCovers?: boolean
}

export async function getPage(
  pageId: string,
  options?: GetPageOptions
): Promise<ExtendedRecordMap> {
  const recordMap = await notion.getPage(pageId, {
    ...(options?.collectionReducerLimit && {
      collectionReducerLimit: options.collectionReducerLimit
    })
  })

  // Note: the custom navigation header (navigationStyle: 'custom') does NOT
  // require nav-link block info in this page's record map. Nav titles are
  // static (`navigationLinks[].title` in site.config.ts) and nav URLs resolve
  // via `pageUrlOverrides` through `getCanonicalPageId`/`mapPageUrl` — every
  // nav target has an explicit override (or is the root page → "/"). The
  // upstream starter kit fetched each nav link page here (1 Notion getPage per
  // link, 5 sub-requests per cold worker) to slug-resolve titleless targets;
  // that's dead weight for this site (issue #16), so we skip it entirely.

  // LQIP preview images (blur-up placeholders) are intentionally NOT generated.
  // They require `sharp`'s native binding, which can't run on Cloudflare
  // Workers, so the feature was always disabled here. The implementation
  // (lib/preview-images.ts) and its `lqip-modern` dependency were removed in
  // #52: even the previous runtime-gated `await import('./preview-images')`
  // forced esbuild to walk the `lqip-modern` → `sharp` module graph at BUNDLE
  // time, which hard-errored OpenNext's worker bundler (#51). `recordMap`
  // simply carries no `preview_images`; react-notion-x renders without them.

  await getTweetsMap(recordMap)

  // Inject client-side load-more limit into collection views so
  // react-notion-x renders a "Load More" button instead of all rows.
  if (options?.collectionLoadLimit || options?.enableGalleryCovers) {
    // Resolve the property IDs we want every gallery card to display, by name,
    // from the collection schema. react-notion-x renders a gallery card's
    // non-title properties only if the view's `format.gallery_properties`
    // lists them — so a view configured to show the title alone produces
    // title-only cards, which breaks the /resources search + category filter
    // (issue #19: it greps card text / counts category tags). We force the
    // search-relevant properties to be visible on every gallery view so the
    // toolbar always has data, regardless of how each Notion view is set up.
    const searchPropertyIds = options?.enableGalleryCovers
      ? resolveGalleryPropertyIds(recordMap, [
          'Category',
          'Value', // schema name has a trailing space ("Value "); matched loosely
          'Eligibility'
        ])
      : []

    for (const viewData of Object.values(recordMap.collection_view)) {
      const view = (viewData as any)?.value
      if (!view) continue

      if (!view.format) view.format = {}

      if (options.collectionLoadLimit) {
        view.format.inline_collection_first_load_limit = {
          limit: options.collectionLoadLimit
        }
      }

      // Force gallery covers to use page_cover so every card shows
      // an image or the styled empty placeholder.
      if (options.enableGalleryCovers && view.type === 'gallery') {
        view.format.gallery_cover = { type: 'page_cover' }
        view.format.gallery_cover_size = 'medium'
        view.format.gallery_cover_aspect = 'cover'

        // Ensure the search-relevant properties are present and visible in
        // this view's gallery_properties, preserving any existing entries.
        const existing: any[] = Array.isArray(view.format.gallery_properties)
          ? view.format.gallery_properties
          : []
        const byId = new Map<string, any>()
        // Title is always shown by react-notion-x; keep whatever's there.
        for (const p of existing) {
          if (p?.property) byId.set(p.property, { ...p })
        }
        for (const propId of searchPropertyIds) {
          byId.set(propId, { property: propId, visible: true })
        }
        if (byId.size > 0) {
          view.format.gallery_properties = [...byId.values()]
        }
      }
    }
  }

  // --- Fix stale collection view filters for Category (enum_contains) ---
  // Notion's collection query index can be stale, so we re-run filters
  // client-side against the actual block data and patch collection_query.
  // Runs for every page, not just /resources: guide pages embed *linked*
  // views of the Resources collection whose filter lives in
  // `format.property_filters` (not `query2.filter`), and Notion's query for a
  // linked view returns the whole collection — /guides/ev-incentives shipped
  // all 256 cards (2 MB) instead of the ~15 "Car" ones (issue #126, C4).
  const patchedCollections = new Set<string>()
  {
    const collectionQuery = (recordMap as any).collection_query
    if (collectionQuery) {
      // Build the allBlocks map ONCE for the whole record map, not per
      // collection × per view (was O(V × N), now O(N)). On /resources with
      // 6 views × 1500+ blocks that's ~9000 fewer object accesses.
      const allBlocks: Record<string, any> = {}
      for (const [blockId, blockData] of Object.entries(
        recordMap.block as Record<string, any>
      )) {
        const block =
          (blockData as any)?.value?.value ?? (blockData as any)?.value
        if (block) allBlocks[blockId] = block
      }

      for (const [collectionId, collectionData] of Object.entries(
        recordMap.collection as Record<string, any>
      )) {
        const schema =
          collectionData?.value?.value?.schema ?? collectionData?.value?.schema
        if (!schema) continue

        // Find the Category property ID from the schema
        let categoryPropId: string | null = null
        for (const [propId, propDef] of Object.entries(
          schema as Record<string, any>
        )) {
          if (
            propDef?.name === 'Category' &&
            propDef?.type === 'multi_select'
          ) {
            categoryPropId = propId
            break
          }
        }
        if (!categoryPropId) continue

        for (const [viewId, viewData] of Object.entries(
          recordMap.collection_view as Record<string, any>
        )) {
          const view =
            (viewData as any)?.value?.value ?? (viewData as any)?.value
          if (!view) continue

          const query2 = view.query2 ?? {}

          // Normalize the two places Notion stores a view filter into the
          // grouped shape blockMatchesFilter expects:
          //   query2.filter            — { operator, filters: [group|leaf…] }
          //   format.property_filters  — [{ id, filter: leaf }…]  (linked views)
          // A leaf (has `.property`) at the top level is wrapped in its own
          // AND group so flat filters like the "Seniors" view also apply.
          let topFilter: any = query2.filter
          if (
            !topFilter?.filters?.length &&
            Array.isArray(view.format?.property_filters) &&
            view.format.property_filters.length > 0
          ) {
            topFilter = {
              operator: 'and',
              filters: view.format.property_filters
                .map((p: any) => p?.filter)
                .filter(Boolean)
            }
          }
          if (!topFilter?.filters?.length) continue
          const outerFilters: any[] = topFilter.filters.map((f: any) =>
            f?.property ? { operator: 'and', filters: [f] } : f
          )

          // Check if this view has enum_contains or is_not_empty filters on Category
          const hasCategoryFilter = outerFilters.some((group: any) => {
            const inner: any[] = group.filters
            if (!inner) return false
            return inner.some(
              (f: any) =>
                f.property === categoryPropId &&
                (f.filter?.operator === 'enum_contains' ||
                  f.filter?.operator === 'is_not_empty')
            )
          })
          if (!hasCategoryFilter) continue

          // Get the block IDs that were in the original query result for this view
          const queryResult = collectionQuery?.[collectionId]?.[viewId]
          if (!queryResult) continue

          // Collect all known block IDs from the collection query
          // (from the top-level blockIds plus all group blockIds)
          const candidateIds = new Set<string>()
          const groupResults =
            queryResult.collection_group_results ?? queryResult
          if (groupResults?.blockIds) {
            for (const id of groupResults.blockIds) candidateIds.add(id)
          }
          // Also gather from any group results
          if (groupResults?.groupResults) {
            for (const group of groupResults.groupResults) {
              if (group?.blockIds) {
                for (const id of group.blockIds) candidateIds.add(id)
              }
            }
          }
          // Also include all blocks from recordMap.block as candidates
          // since stale filters may have excluded valid blocks
          for (const blockId of Object.keys(allBlocks)) {
            candidateIds.add(blockId)
          }

          // Filter candidate blocks
          const matchedIds = [...candidateIds].filter((id) => {
            // Only consider blocks that are actual page entries (have a parent)
            const block = allBlocks[id]
            if (!block) return false
            // Must be a page block that belongs to this collection
            if (
              block.parent_id !== collectionId &&
              block.parent_table !== 'collection'
            )
              return false
            return blockMatchesFilter(
              allBlocks,
              categoryPropId!,
              topFilter,
              outerFilters,
              id
            )
          })

          // Apply sort if defined
          const sorts: any[] = query2.sort ?? []
          if (sorts.length > 0) {
            matchedIds.sort((a, b) => {
              for (const sortDef of sorts) {
                const prop = sortDef.property
                const direction = sortDef.direction === 'descending' ? -1 : 1
                const aBlock = allBlocks[a]
                const bBlock = allBlocks[b]

                let aVal = ''
                let bVal = ''

                if (prop === 'title' || schema[prop]?.type === 'title') {
                  aVal = aBlock?.properties?.title?.[0]?.[0] ?? ''
                  bVal = bBlock?.properties?.title?.[0]?.[0] ?? ''
                } else {
                  aVal = aBlock?.properties?.[prop]?.[0]?.[0] ?? ''
                  bVal = bBlock?.properties?.[prop]?.[0]?.[0] ?? ''
                }

                const cmp = aVal.localeCompare(bVal)
                if (cmp !== 0) return cmp * direction
              }
              return 0
            })
          }

          // Patch the collection_query results
          if (collectionQuery[collectionId]?.[viewId]) {
            patchedCollections.add(collectionId)
            const target = collectionQuery[collectionId][viewId]
            if (target.collection_group_results) {
              target.collection_group_results.blockIds = matchedIds
            } else {
              target.blockIds = matchedIds
            }
          }
        }
      }
    }
  }

  // Drop collection rows no view on this page shows. After the filter pass a
  // guide's linked gallery lists ~15 blockIds, but the recordMap still carries
  // all 256 row blocks (that's the 2 MB). /resources is excluded: its views are
  // the whole catalog and its search/filter toolbar greps every card.
  if (!options?.enableGalleryCovers && patchedCollections.size > 0) {
    const collectionQuery = (recordMap as any).collection_query ?? {}
    const shown = new Map<string, Set<string>>()
    for (const collectionId of patchedCollections) {
      const ids = new Set<string>()
      for (const q of Object.values(collectionQuery[collectionId] ?? {})) {
        const r: any = (q as any)?.collection_group_results ?? q
        for (const id of r?.blockIds ?? []) ids.add(id)
        for (const g of r?.groupResults ?? [])
          for (const id of g?.blockIds ?? []) ids.add(id)
      }
      shown.set(collectionId, ids)
    }
    for (const [blockId, blockData] of Object.entries(
      recordMap.block as Record<string, any>
    )) {
      const block =
        (blockData as any)?.value?.value ?? (blockData as any)?.value
      if (block?.parent_table !== 'collection') continue
      const ids = shown.get(block.parent_id)
      if (ids && !ids.has(blockId) && blockId !== pageId) {
        delete (recordMap.block as Record<string, any>)[blockId]
      }
    }
  }

  return recordMap
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params)
}

// ---------------------------------------------------------------------------
// Timeout + error classification for the page render path (issue #126, A1/A3)
// ---------------------------------------------------------------------------

/**
 * Thrown by {@link withNotionTimeout} when Notion does not answer in time.
 * Kept as its own class so `pages/[...pageId].tsx` can tell "Notion was slow"
 * (transient — never cache a 404 for it) apart from "Notion says this page
 * does not exist" (a genuine miss).
 */
export class NotionTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`notion timeout after ${timeoutMs}ms`)
    this.name = 'NotionTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * Race `promise` against a hard deadline. notion-client retries 429/5xx
 * internally, so a single slow upstream can otherwise eat the whole Worker
 * request budget. The timer is cleared when the race settles so a fast
 * resolution does not leave a dangling timeout behind.
 */
export function withNotionTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new NotionTimeoutError(timeoutMs)),
      timeoutMs
    )
  })
  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

// HTTP statuses that mean "try again later", not "this page is gone".
const TRANSIENT_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

// Node / undici network-level error codes.
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'ABORT_ERR'
])

const TRANSIENT_MESSAGE_PATTERN =
  /timeout|timed out|fetch failed|network|socket hang up|premature close|ECONN|<no response>/i

/**
 * Classify an error from the Notion fetch path.
 *
 * Returns `true` when the failure says nothing about whether the page exists
 * — our own timeout, a network-level failure (ofetch `FetchError` with no
 * response, undici codes), or an upstream 429/5xx. Returns `false` for
 * definitive answers: any other HTTP 4xx, notion-client's own
 * `Notion page not found "…"` / `invalid notion pageId "…"`, and anything we
 * can't recognise (unknown ⇒ treat as a real miss, which is the pre-#126
 * behaviour, only with a much shorter cache).
 *
 * ofetch's `FetchError` exposes `status`/`statusCode` as getters that are
 * `undefined` when there was no response at all, and carries the underlying
 * `TypeError: fetch failed` as `cause` — both shapes are handled.
 */
export function isTransientNotionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if (err instanceof NotionTimeoutError) return true

  const e = err as {
    name?: unknown
    message?: unknown
    code?: unknown
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    cause?: unknown
  }

  const status =
    typeof e.status === 'number'
      ? e.status
      : typeof e.statusCode === 'number'
        ? e.statusCode
        : typeof e.response?.status === 'number'
          ? e.response.status
          : undefined
  if (status !== undefined) {
    // An HTTP answer is definitive unless it is one of the retry-later codes.
    return TRANSIENT_HTTP_STATUS.has(status)
  }

  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true
  if (typeof e.code === 'string' && TRANSIENT_ERROR_CODES.has(e.code)) {
    return true
  }
  if (
    typeof e.message === 'string' &&
    TRANSIENT_MESSAGE_PATTERN.test(e.message)
  ) {
    return true
  }
  if (e.cause && e.cause !== err) return isTransientNotionError(e.cause)
  return false
}
