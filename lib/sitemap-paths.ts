/**
 * Pure helpers for pages/sitemap.xml.tsx (issue #126, C2).
 *
 * `pageUrlOverrides` only knows about Notion-backed URLs, so anything rendered
 * from `pages/*.tsx` has to be listed in STATIC_SITEMAP_PATHS explicitly.
 * Paths are written without the leading slash to match the override keys.
 */

/**
 * React (non-Notion) pages that must be in the sitemap. `/donate`, `/show`
 * and `/candela` also exist as overrides — `buildSitemapPaths` dedupes, so
 * listing them here is harmless and keeps this list honest about which React
 * pages exist.
 */
export const STATIC_SITEMAP_PATHS: readonly string[] = [
  'qualify',
  'donate',
  'show',
  'guides',
  'candela'
]

/**
 * Paths that must NOT appear in the sitemap even if an override exists:
 *   - `submit` is `noindex` (intake form).
 *   - `welcome-to-techempowerorg` is the raw Notion root page, a 2.4 MB
 *     duplicate of the homepage; next.config.js 301s it to `/`.
 */
export const SITEMAP_EXCLUDED_PATHS: ReadonlySet<string> = new Set([
  'submit',
  'welcome-to-techempowerorg'
])

/**
 * Merge static React pages with the Notion override slugs, strip any leading
 * slashes, drop excluded + duplicate entries, preserve first-seen order
 * (static pages first so the important URLs lead the file).
 */
export function buildSitemapPaths(
  overridePaths: readonly string[],
  extraPaths: readonly string[] = STATIC_SITEMAP_PATHS,
  excluded: ReadonlySet<string> = SITEMAP_EXCLUDED_PATHS
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...extraPaths, ...overridePaths]) {
    const path = raw.replace(/^\/+/, '')
    if (!path || excluded.has(path) || seen.has(path)) continue
    seen.add(path)
    out.push(path)
  }
  return out
}
