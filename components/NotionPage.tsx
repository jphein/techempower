import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image from 'next/legacy/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import NProgress from 'nprogress'
import { type PageBlock } from 'notion-types'
import {
  formatDate,
  getBlockTitle,
  getBlockValue,
  getPageProperty
} from 'notion-utils'
import * as React from 'react'
import BodyClassName from 'react-body-classname'
import {
  type NotionComponents,
  NotionRenderer,
  useNotionContext
} from 'react-notion-x'
import { Collection } from 'react-notion-x/third-party/collection'
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { useSearchParam } from 'react-use'

import type * as types from '@/lib/types'
import * as config from '@/lib/config'
import { findSpanishBlockIds } from '@/lib/extract-spanish-blocks'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import {
  getRelatedGuides,
  GUIDE_BY_ID,
  isGuidePage,
  isResourcesPage
} from '@/lib/page-ids'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Breadcrumb, buildGuideBreadcrumb } from './Breadcrumb'
import { GitHubShareButton } from './GitHubShareButton'
import { Loading } from './Loading'
import { Page404 } from './Page404'
import { PageAside } from './PageAside'
import { PageHead } from './PageHead'
import { RelatedGuides } from './RelatedGuides'
import { SpanishToggle } from './SpanishToggle'
import { StructuredData } from './StructuredData'
import styles from './styles.module.css'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code = dynamic(() =>
  import('react-notion-x/third-party/code').then(async (m) => {
    // add / remove any prism syntaxes here
    await Promise.allSettled([
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-markup-templating.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-markup.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-bash.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-c.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-cpp.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-csharp.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-docker.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-java.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-js-templates.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-coffeescript.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-diff.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-git.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-go.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-graphql.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-handlebars.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-less.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-makefile.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-markdown.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-objectivec.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-ocaml.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-python.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-reason.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-rust.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-sass.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-scss.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-solidity.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-sql.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-stylus.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-swift.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-wasm.js'),
      // @ts-expect-error Ignore prisma types
      import('prismjs/components/prism-yaml.js')
    ])
    return m.Code
  })
)

const Equation = dynamic(() =>
  import('react-notion-x/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import('react-notion-x/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false
  }
)
const Modal = dynamic(
  () =>
    import('react-notion-x/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
)

function Tweet({ id }: { id: string }) {
  const { recordMap } = useNotionContext()
  const tweet = (recordMap as types.ExtendedTweetRecordMap)?.tweets?.[id]

  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      {tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />}
    </React.Suspense>
  )
}

const propertyLastEditedTimeValue = (
  { block, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long'
    })}`
  }

  return defaultFn()
}

const propertyDateValue = (
  { data, schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

    if (publishDate) {
      return `${formatDate(publishDate, {
        month: 'long'
      })}`
    }
  }

  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }

  return defaultFn()
}

const notionRendererComponents: Partial<NotionComponents> = {
  nextLegacyImage: Image,
  nextLink: Link,
  Code,
  Collection,
  Equation,
  Pdf,
  Modal,
  Tweet,
  Header: () => null,
  propertyLastEditedTimeValue,
  propertyTextValue,
  propertyDateValue
}

export function NotionPage({
  site,
  recordMap: initialRecordMap,
  error,
  pageId
}: types.PageProps) {
  const router = useRouter()
  const lite = useSearchParam('lite')

  // lite mode is for oembed
  const isLiteMode = lite === 'true'

  const { isDarkMode } = useDarkMode()

  // Resources page manages recordMap as state so we can swap in the
  // full dataset after the initial 50-row SSR load.
  const [recordMap, setRecordMap] = React.useState(initialRecordMap)
  const [hasLoadedAll, setHasLoadedAll] = React.useState(false)

  // Reset state when navigating to a new page
  React.useEffect(() => {
    setRecordMap(initialRecordMap)
    setHasLoadedAll(false)
  }, [initialRecordMap])

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite

    const searchParams = new URLSearchParams(params)
    return site ? mapPageUrl(site, recordMap!, searchParams) : undefined
  }, [site, recordMap, lite])

  const keys = Object.keys(recordMap?.block || {})
  const block = getBlockValue(recordMap?.block?.[keys[0]!])

  const isHomePage = pageId === site?.rootNotionPageId
  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection'
  const isGuide = isGuidePage(pageId)
  const isResources = isResourcesPage(pageId)
  const guideMeta = pageId
    ? GUIDE_BY_ID.get(pageId.replaceAll('-', ''))
    : undefined
  const relatedGuides = pageId ? getRelatedGuides(pageId) : []

  const spanishBlockIds = React.useMemo(
    () => (isGuide && recordMap ? findSpanishBlockIds(recordMap) : []),
    [isGuide, recordMap]
  )

  // Fetch full resources when "Load all" is clicked
  const loadAllResources = React.useCallback(async () => {
    if (hasLoadedAll) return
    NProgress.start()
    try {
      const res = await fetch('/api/resources-more')
      if (!res.ok) throw new Error('fetch failed')
      const data = (await res.json()) as { recordMap: typeof initialRecordMap }
      setRecordMap(data.recordMap)
      setHasLoadedAll(true)
    } catch {
      // Silently fail — user still has the initial 50 rows
    } finally {
      NProgress.done()
    }
  }, [hasLoadedAll])

  // Bind NProgress to built-in Load More buttons + inject "Load all"
  // button after the built-in ones are exhausted.
  React.useEffect(() => {
    if (!isResources) return

    function handleLoadMoreClick() {
      NProgress.start()
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          NProgress.done()
        })
      })
    }

    const observer = new MutationObserver(() => {
      const buttons = document.querySelectorAll(
        '.resources-page .notion-collection-load-more'
      )
      for (const btn of buttons) {
        if (!(btn as any).__nprogress) {
          btn.addEventListener('click', handleLoadMoreClick)
          ;(btn as any).__nprogress = true
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    const buttons = document.querySelectorAll(
      '.resources-page .notion-collection-load-more'
    )
    for (const btn of buttons) {
      btn.addEventListener('click', handleLoadMoreClick)
      ;(btn as any).__nprogress = true
    }

    return () => {
      observer.disconnect()
      const btns = document.querySelectorAll(
        '.resources-page .notion-collection-load-more'
      )
      for (const btn of btns) {
        btn.removeEventListener('click', handleLoadMoreClick)
      }
    }
  }, [isResources])

  const showTableOfContents = !!isBlogPost || !!isGuide
  const minTableOfContentsItems = 3

  const pageAside = React.useMemo(
    () => (
      <PageAside
        block={block!}
        recordMap={recordMap!}
        isBlogPost={isBlogPost}
      />
    ),
    [block, recordMap, isBlogPost]
  )

  if (router.isFallback) {
    return <Loading />
  }

  if (error || !site || !block || !recordMap) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  const title = getBlockTitle(block, recordMap) || site.name

  if (config.isDev) {
    console.log('notion page', {
      title,
      pageId,
      rootNotionPageId: site.rootNotionPageId,
      recordMap
    })
  }

  if (!config.isServer) {
    // add important objects to the window global for easy debugging
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl = config.isDev
    ? undefined
    : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block
  )

  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) ||
    config.description

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
        isBlogPost={isBlogPost}
      />

      {isHomePage && <StructuredData />}

      {isLiteMode && <BodyClassName className='notion-lite' />}
      {isDarkMode && <BodyClassName className='dark-mode' />}

      {isGuide && (
        <Breadcrumb items={buildGuideBreadcrumb(guideMeta?.title || title)} />
      )}

      {isGuide && spanishBlockIds.length > 0 && (
        <SpanishToggle
          blockIds={spanishBlockIds}
          recordMap={recordMap!}
          darkMode={isDarkMode}
        />
      )}

      <NotionRenderer
        bodyClassName={cs(
          styles.notion,
          pageId === site.rootNotionPageId && 'index-page',
          isResources && 'resources-page'
        )}
        darkMode={isDarkMode}
        components={notionRendererComponents}
        recordMap={recordMap!}
        rootPageId={site.rootNotionPageId}
        rootDomain={site.domain}
        fullPage={!isLiteMode}
        previewImages={!!recordMap!.preview_images}
        showCollectionViewDropdown={isResources}
        showTableOfContents={showTableOfContents}
        minTableOfContentsItems={minTableOfContentsItems}
        defaultPageIcon={config.defaultPageIcon}
        defaultPageCover={config.defaultPageCover}
        defaultPageCoverPosition={config.defaultPageCoverPosition}
        mapPageUrl={siteMapPageUrl}
        mapImageUrl={mapImageUrl}
        searchNotion={config.isSearchEnabled ? searchNotion : undefined}
        pageAside={pageAside}
      />

      {isResources && !hasLoadedAll && (
        <div className={styles.loadAllResources}>
          <button
            type='button'
            onClick={loadAllResources}
            className={styles.loadAllButton}
          >
            Load all resources
          </button>
        </div>
      )}

      {isGuide && relatedGuides.length > 0 && (
        <RelatedGuides guides={relatedGuides} />
      )}

      <GitHubShareButton />
    </>
  )
}
