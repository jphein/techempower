import { type GetServerSideProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { type PageProps, type Params } from '@/lib/types'

export const getServerSideProps: GetServerSideProps<PageProps, Params> = async (
  context
) => {
  const segments = context.params?.pageId as string[] | undefined
  const rawPageId = segments ? segments.join('/') : undefined

  try {
    const props = await resolveNotionPage(domain, rawPageId)

    // Cache at the CDN edge for 5 minutes, serve stale while revalidating
    context.res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600'
    )

    return { props }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)
    return { notFound: true }
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
