import { type ExtendedRecordMap } from 'notion-types'
import { parsePageId, uuidToId } from 'notion-utils'

import type { PageProps } from './types'
import * as acl from './acl'
import {
  environment,
  includeNotionIdInUrls,
  pageUrlAdditions,
  pageUrlOverrides,
  site
} from './config'
import { db } from './db'
import { getCanonicalPageId } from './get-canonical-page-id'
import { getSiteMap } from './get-site-map'
import { getPage, type GetPageOptions } from './notion'
import { notion } from './notion-api'
import { RESOURCES_PAGE } from './page-ids'

export async function resolveNotionPage(
  domain: string,
  rawPageId?: string,
  pageOptions?: GetPageOptions
): Promise<PageProps> {
  let pageId: string | undefined
  let recordMap: ExtendedRecordMap

  if (rawPageId && rawPageId !== 'index') {
    pageId = parsePageId(rawPageId)!

    if (!pageId) {
      // check if the site configuration provides an override or a fallback for
      // the page's URI
      const override =
        pageUrlOverrides[rawPageId] || pageUrlAdditions[rawPageId]

      if (override) {
        pageId = parsePageId(override)!
      }
    }

    const useUriToPageIdCache = true
    const cacheKey = `uri-to-page-id:${domain}:${environment}:${rawPageId}`
    // TODO: should we use a TTL for these mappings or make them permanent?
    // const cacheTTL = 8.64e7 // one day in milliseconds
    const cacheTTL = undefined // disable cache TTL

    if (!pageId && useUriToPageIdCache) {
      try {
        // check if the database has a cached mapping of this URI to page ID
        pageId = await db.get(cacheKey)

        // console.log(`redis get "${cacheKey}"`, pageId)
      } catch (err: any) {
        // ignore redis errors
        console.warn(`redis error get "${cacheKey}"`, err.message)
      }
    }

    if (!pageId) {
      // handle mapping of user-friendly canonical page paths to Notion page IDs
      // e.g., /developer-x-entrepreneur versus /71201624b204481f862630ea25ce62fe
      const siteMap = await getSiteMap()
      pageId = siteMap?.canonicalPageMap[rawPageId]
    }

    if (!pageId) {
      // Fallback: resolve slugs for collection items (e.g. resources database
      // entries) by fetching the collection page and matching slugs against
      // the block data it already contains — avoids crawling every item.
      pageId = await resolveCollectionSlug(rawPageId)
    }

    if (pageId) {
      recordMap = await getPage(pageId, pageOptions)

      if (useUriToPageIdCache) {
        try {
          await db.set(cacheKey, pageId, cacheTTL)
        } catch (err: any) {
          console.warn(`redis error set "${cacheKey}"`, err.message)
        }
      }
    } else {
      return {
        error: {
          message: `Not found "${rawPageId}"`,
          statusCode: 404
        }
      }
    }
  } else {
    pageId = site.rootNotionPageId

    console.log(site)
    recordMap = await getPage(pageId, pageOptions)
  }

  const props: PageProps = { site, recordMap, pageId }
  return { ...props, ...(await acl.pageAcl(props)) }
}

/**
 * Resolve a clean URL slug to a Notion page ID by searching through
 * collection items. Fetches the resources collection page (1 API call)
 * and generates canonical slugs for each item to find a match.
 */
async function resolveCollectionSlug(
  slug: string
): Promise<string | undefined> {
  try {
    const collectionRecordMap = await notion.getPage(RESOURCES_PAGE)
    const uuid = !!includeNotionIdInUrls

    for (const [blockId, blockData] of Object.entries(
      collectionRecordMap.block
    )) {
      const block = (blockData as any)?.value
      if (!block || block.type !== 'page') continue

      const canonicalId = getCanonicalPageId(blockId, collectionRecordMap, {
        uuid
      })
      if (canonicalId === slug) {
        return uuidToId(blockId)
      }
    }
  } catch (err) {
    console.warn('resolveCollectionSlug failed', err)
  }

  return undefined
}
