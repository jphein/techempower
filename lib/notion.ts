import {
  type ExtendedRecordMap,
  type SearchParams,
  type SearchResults
} from 'notion-types'
import { mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import {
  isPreviewImageSupportEnabled,
  navigationLinks,
  navigationStyle
} from './config'
import { getTweetsMap } from './get-tweets'
import { notion } from './notion-api'
import { getPreviewImageMap } from './preview-images'

const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link?.pageId)
      .filter(Boolean)

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          notion.getPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false
          }),
        {
          concurrency: 4
        }
      )
    }

    return []
  }
)

export interface GetPageOptions {
  collectionReducerLimit?: number
  /** Inject a client-side load-more limit into every collection view. */
  collectionLoadLimit?: number
}

export async function getPage(
  pageId: string,
  options?: GetPageOptions
): Promise<ExtendedRecordMap> {
  let recordMap = await notion.getPage(pageId, {
    ...(options?.collectionReducerLimit && {
      collectionReducerLimit: options.collectionReducerLimit
    })
  })

  if (navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages()

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
  }

  if (isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(recordMap)
    ;(recordMap as any).preview_images = previewImageMap
  }

  await getTweetsMap(recordMap)

  // Inject client-side load-more limit into collection views so
  // react-notion-x renders a "Load More" button instead of all rows.
  if (options?.collectionLoadLimit) {
    const limit = options.collectionLoadLimit
    for (const viewData of Object.values(recordMap.collection_view)) {
      const view = (viewData as any)?.value
      if (view?.format) {
        view.format.inline_collection_first_load_limit = { limit }
      } else if (view) {
        view.format = { inline_collection_first_load_limit: { limit } }
      }
    }
  }

  return recordMap
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params)
}
