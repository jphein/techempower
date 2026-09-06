import { type GetStaticPaths, type GetStaticProps } from 'next'
import { getBlockValue } from 'notion-utils'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { isTransientNotionError, withNotionTimeout } from '@/lib/notion'
import { isResourcesPage } from '@/lib/page-ids'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { trimRecordMap } from '@/lib/trim-record-map'
import { type PageProps, type Params } from '@/lib/types'

// Resources page is heavy — revalidate every 24 hours. Halves the number
// of cold-render passes per day, and at 12h the page's listed data is
// already meaningfully stable (resources change cadence is days/weeks).
// Other pages revalidate every hour.
const RESOURCES_REVALIDATE = 86_400
const DEFAULT_REVALIDATE = 3600

// Hard caps on Notion resolution time. notion-client retries 429/5xx
// internally via ofetch, which can otherwise eat the whole request budget on a
// single slow upstream.
//
// /resources keeps its original 8 s: it is the heaviest page and is served
// almost exclusively from the R2 ISR cache (24 h revalidate + deploy warm-up),
// so a slow cold render there is better cut short than allowed to pile up.
//
// Everything else gets 14 s (issue #126, A3): the biggest resource detail page
// (/free-technology-resources-for-nonprofits, a 100-item list) genuinely needs
// more than 8 s from Notion on a cold hit. Budget check: the Worker CPU limit
// is 30 s (wrangler.jsonc `limits.cpu_ms`) and waiting on Notion is I/O, not
// CPU; the background revalidation path runs inside `waitUntil`, whose budget
// is 30 s after the response — so 14 s of wait plus a ~2 s render fits both.
const RESOURCES_NOTION_TIMEOUT_MS = 8000
const NOTION_TIMEOUT_MS = 14_000

// ## How `revalidate` becomes a Cache-Control header (Next 16, pages router)
//
// Next emits `s-maxage=<revalidate>, stale-while-revalidate=<expireTime -
// revalidate>` (next/dist/server/lib/cache-control.js), and `expireTime`
// defaults to CACHE_ONE_YEAR_SECONDS (31 536 000). So `revalidate: 3600`
// becomes `s-maxage=3600, stale-while-revalidate=31532400`: any downstream
// cache may keep serving the stale body for a YEAR while it revalidates.
//
// The R2 ISR entry behaves the same way: after <revalidate> seconds it is
// merely *stale*, and the next hit still gets the stale body while OpenNext's
// memory queue re-renders in the background. A page that nobody visits
// therefore never refreshes — the first visitor after any gap always sees the
// old body, and for a long-tail resource page that visitor is Googlebot.
// That is how one Notion blip turned into 53/294 sitemap URLs serving a
// cached 404 (2026-09-05 audit, issue #126 A1): the old code answered EVERY
// failure, transient or not, with `notFound: true, revalidate: 3600`.
//
// Policy now:
//   * Transient upstream failure (timeout, network error, Notion 429/5xx) →
//     THROW. Verified in next/dist/server/response-cache/index.js
//     `handleRevalidate()`: a thrown error is never written to the
//     incremental cache. With no previous entry Next answers 500 with
//     `private, no-cache, no-store` (renderErrorImpl); with a previous good
//     entry Next keeps serving it and retries in 3–30 s. A blip can therefore
//     never replace a good page, and never produce a cached 404.
//   * Genuine miss (slug resolves to nothing; Notion says the page is gone) →
//     `notFound`, revalidate 300 s. It IS a real 404, but if the content shows
//     up (new Notion row, lockfile refresh) it self-heals within five minutes
//     instead of a year.
//   * Scanner probe (`/.env`, `/wp-admin`, …) → `notFound`, revalidate 24 h.
//     No Notion call is made and the answer cannot change, so cache it hard.
const NOT_FOUND_REVALIDATE = 300
const SCANNER_REVALIDATE = 86_400

// Vulnerability scanner targets observed in production logs (env files,
// VCS metadata, common CMS attack surfaces). Matched paths short-circuit
// to a 404 here, before Notion is touched and the renderer is invoked.
const SCANNER_PATTERN =
  /(?:^|\/)(?:\.env[a-z.-]*|\.git|\.aws|\.ssh|\.svn|\.hg|\.htaccess|\.htpasswd|\.DS_Store|wp-admin|wp-includes|wp-content|wp-login|phpmyadmin|administrator|cgi-bin|vendor|laravel|symfony)(?:\/|$)|\.(?:php|asp|aspx|jsp|cgi|sh|bak|sql|env)$/i

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps<PageProps, Params> = async (
  context
) => {
  const segments = context.params?.pageId as string[] | undefined
  const rawPageId = segments ? segments.join('/') : undefined

  if (rawPageId && SCANNER_PATTERN.test(`/${rawPageId}`)) {
    return { notFound: true, revalidate: SCANNER_REVALIDATE }
  }

  try {
    const isResources = rawPageId === 'resources'
    const props = await withNotionTimeout(
      resolveNotionPage(
        domain,
        rawPageId,
        isResources
          ? { collectionLoadLimit: 20, enableGalleryCovers: true }
          : undefined
      ),
      isResources ? RESOURCES_NOTION_TIMEOUT_MS : NOTION_TIMEOUT_MS
    )

    // Genuine miss: resolveNotionPage *resolves* (rather than throwing) with
    // an error payload when a slug can't be mapped to a Notion page. Returning
    // those props yields HTTP 200 with the not-found UI rendered client-side —
    // a soft-404 that search engines index as a real page (issue #46). Return
    // `notFound: true` instead so Next serves pages/404.tsx with a real 404
    // status. The scanner short-circuit above already proves `notFound: true`
    // produces a genuine 404 on OpenNext/Workers. Every error this resolution
    // path emits (resolveNotionPage + pageAcl) is a 404, but gate on the
    // status code explicitly so a future non-404 error isn't masked as a miss.
    // resolveNotionPage only reaches this payload after getSiteMap() and
    // resolveCollectionSlug() both completed without throwing, so it is a
    // real miss, not a blip — short cache, see the policy block above.
    if (props.error?.statusCode === 404) {
      return { notFound: true, revalidate: NOT_FOUND_REVALIDATE }
    }

    const revalidate = isResourcesPage(props.pageId)
      ? RESOURCES_REVALIDATE
      : DEFAULT_REVALIDATE

    // Sanitize block properties to prevent react-notion-x SSR crashes
    // from malformed URLs in Notion data (e.g. URLs wrapped in quotes).
    // Only `page` blocks carry URL properties that have been observed to
    // contain quote-wrapped values — skipping the other 95% of blocks
    // (text/callout/divider/etc.) cuts this loop's cost ~20x on /resources.
    if (props.recordMap?.block) {
      const unquote = (str: unknown) =>
        typeof str === 'string' &&
        str.length > 1 &&
        ((str.startsWith("'") && str.endsWith("'")) ||
          (str.startsWith('"') && str.endsWith('"')))
          ? str.slice(1, -1)
          : str
      for (const blockData of Object.values(props.recordMap.block)) {
        // Newer Notion responses double-wrap blocks (`{ value: { value, role } }`);
        // reading `.value` directly yields an object with no `type`, which is
        // why this sanitizer silently matched nothing until 2026-09-05.
        const block = getBlockValue(blockData as any) as any
        // Image blocks pasted from the web sometimes arrive with the URL
        // wrapped in literal quotes (`'https://…'`). react-notion-x feeds
        // that straight into `new URL()` and the whole page 500s (2026-09-05
        // audit: grants.gov, Pollination Project, Spark Good, KFC Foundation).
        if (block?.type === 'image') {
          const src = block.properties?.source?.[0]?.[0]
          if (typeof src === 'string') {
            block.properties.source[0][0] = unquote(src)
          }
          if (typeof block.format?.display_source === 'string') {
            block.format.display_source = unquote(block.format.display_source)
          }
          continue
        }
        if (block?.type !== 'page' || !block.properties) continue
        for (const [key, val] of Object.entries(block.properties)) {
          if (Array.isArray(val) && Array.isArray(val[0])) {
            const str = val[0][0]
            if (typeof str === 'string') {
              if (
                (str.startsWith("'") && str.endsWith("'")) ||
                (str.startsWith('"') && str.endsWith('"'))
              ) {
                block.properties[key] = [[str.slice(1, -1)]]
              }
            }
          }
        }
      }
    }

    // Strip Notion metadata fields the renderer doesn't read. On /resources
    // (253 cards × multiple blocks) this drops the SSR body by ~30-50%,
    // pulling us back under the Workers Free plan's 6 MB response cap.
    if (props.recordMap) {
      trimRecordMap(props.recordMap)
    }

    return { props, revalidate }
  } catch (err) {
    if (isTransientNotionError(err)) {
      // Re-throw: Next serves an uncached 500 (or keeps the previous good
      // entry) instead of caching a 404 that would outlive the blip by a year.
      console.error(
        'page error (transient, not cached)',
        domain,
        rawPageId,
        err
      )
      throw err
    }
    // Definitive failure from Notion (page deleted / never existed / 4xx).
    console.error('page error (not found)', domain, rawPageId, err)
    return { notFound: true, revalidate: NOT_FOUND_REVALIDATE }
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
