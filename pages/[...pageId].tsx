import { type GetStaticPaths, type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { isResourcesPage } from '@/lib/page-ids'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { type PageProps, type Params } from '@/lib/types'

// Resources page is heavy — revalidate every 12 hours.
// Other pages revalidate every hour.
const RESOURCES_REVALIDATE = 43200
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

    return { props, revalidate }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)
    return { notFound: true, revalidate: 60 }
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
