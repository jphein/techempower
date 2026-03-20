import { type GetServerSideProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { isResourcesPage, RESOURCES_PAGE } from '@/lib/page-ids'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { type PageProps, type Params } from '@/lib/types'

// Resources page is a heavy database fetch that rarely changes —
// cache it aggressively (12 hours fresh, 7 days stale).
const RESOURCES_CACHE = 'public, s-maxage=43200, stale-while-revalidate=604800'

// Default: 1 hour fresh, 24 hours stale-while-revalidate.
const DEFAULT_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400'

export const getServerSideProps: GetServerSideProps<PageProps, Params> = async (
  context
) => {
  const segments = context.params?.pageId as string[] | undefined
  const rawPageId = segments ? segments.join('/') : undefined

  // Detect resources page early so we can optimize the fetch
  const isResources =
    rawPageId === 'resources' || rawPageId === RESOURCES_PAGE

  try {
    const props = await resolveNotionPage(
      domain,
      rawPageId,
      isResources
        ? { collectionReducerLimit: 50, collectionLoadLimit: 20 }
        : undefined
    )

    const cachePolicy = isResourcesPage(props.pageId)
      ? RESOURCES_CACHE
      : DEFAULT_CACHE

    context.res.setHeader('Cache-Control', cachePolicy)

    return { props }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)
    return { notFound: true }
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
