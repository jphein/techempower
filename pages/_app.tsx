// used for rendering equations (optional)
import 'katex/dist/katex.min.css'
// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-coy.css'
// core styles shared by all of react-notion-x (required)
import 'react-notion-x/styles.css'
// global styles shared across the entire site
import 'styles/global.css'
// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'
// global style overrides for notion
import 'styles/notion.css'
// global style overrides for prism theme (optional)
import 'styles/prism-theme.css'

import type { AppProps } from 'next/app'
import * as Fathom from 'fathom-client'
import { useRouter } from 'next/router'
import NProgress from 'nprogress'
import { posthog } from 'posthog-js'
import * as React from 'react'

import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { Layout } from '@/components/Layout'
import { bootstrap } from '@/lib/bootstrap-client'
import {
  fathomConfig,
  fathomId,
  isServer,
  posthogConfig,
  posthogId
} from '@/lib/config'

// Slow trickle so the bar reaches ~40% during a 7-second server fetch,
// not 99%. This prevents the bar from appearing "stuck" near the end.
NProgress.configure({ showSpinner: false, trickleSpeed: 800 })
// @ts-expect-error trickleRate exists at runtime but not in types
NProgress.settings.trickleRate = 0.01

if (!isServer) {
  bootstrap()
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  React.useEffect(() => {
    function onRouteChangeComplete() {
      NProgress.done()

      if (fathomId) {
        Fathom.trackPageview()
      }

      if (posthogId) {
        posthog.capture('$pageview')
      }
    }

    if (fathomId) {
      Fathom.load(fathomId, fathomConfig)
    }

    if (posthogId) {
      posthog.init(posthogId, posthogConfig)
    }

    router.events.on('routeChangeStart', NProgress.start)
    router.events.on('routeChangeComplete', onRouteChangeComplete)
    router.events.on('routeChangeError', NProgress.done)

    return () => {
      router.events.off('routeChangeStart', NProgress.start)
      router.events.off('routeChangeComplete', onRouteChangeComplete)
      router.events.off('routeChangeError', NProgress.done)
    }
  }, [router.events])

  return (
    <>
      <GoogleAnalytics />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  )
}
