import { type GetStaticPaths, type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { isResourcesPage } from '@/lib/page-ids'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { type PageProps, type Params } from '@/lib/types'

// Resources page is heavy — revalidate every 12 hours.
// Other pages revalidate every hour.
const RESOURCES_REVALIDATE = 43_200
const DEFAULT_REVALIDATE = 3600

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps<PageProps, Params> = async (
  context
) => {
  const segments = context.params?.pageId as string[] | undefined
  const rawPageId = segments ? segments.join('/') : undefined

  try {
    const isResources = rawPageId === 'resources'
    const props = await resolveNotionPage(
      domain,
      rawPageId,
      isResources
        ? { collectionLoadLimit: 20, enableGalleryCovers: true }
        : undefined
    )

    const revalidate = isResourcesPage(props.pageId)
      ? RESOURCES_REVALIDATE
      : DEFAULT_REVALIDATE

    // Sanitize block properties to prevent react-notion-x SSR crashes
    // from malformed URLs in Notion data (e.g. URLs wrapped in quotes).
    if (props.recordMap?.block) {
      for (const blockData of Object.values(props.recordMap.block)) {
        const block = (blockData as any)?.value
        if (!block?.properties) continue
        for (const [key, val] of Object.entries(block.properties)) {
          if (Array.isArray(val) && Array.isArray(val[0])) {
            const str = val[0][0]
            if (typeof str === 'string') {
              // Strip wrapping single or double quotes (e.g. "'https://...'" stored in Notion)
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

    return { props, revalidate }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)
    return { notFound: true, revalidate: 60 }
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
