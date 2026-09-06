import type * as React from 'react'
import Head from 'next/head'

import * as config from '@/lib/config'
import { getSocialImageUrl } from '@/lib/get-social-image-url'
import { HOME_PAGE } from '@/lib/page-ids'

// <Head> for the React-rendered pages (/, /qualify, /submit, /guides). Notion
// pages get the same set from PageHead; this keeps the two in step: canonical,
// og:url, the dynamic OG card from /api/social-image, twitter:card.

interface StaticPageHeadProps {
  /** Full document title, exactly as it should appear in the tab. */
  title: string
  description: string
  /** Path from the site root, e.g. '/' or '/qualify'. */
  path: string
  /**
   * Title printed on the OG card. Omit for the site-level mission card (the
   * homepage uses that one).
   */
  socialTitle?: string
  noindex?: boolean
  children?: React.ReactNode
}

export function StaticPageHead({
  title,
  description,
  path,
  socialTitle,
  noindex,
  children
}: StaticPageHeadProps) {
  const url = `https://${config.domain}${path === '/' ? '' : path}`
  const socialImageUrl = getSocialImageUrl(
    socialTitle ? undefined : HOME_PAGE,
    socialTitle
  )

  return (
    <Head>
      <meta charSet='utf-8' />
      <meta httpEquiv='Content-Type' content='text/html; charset=utf-8' />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover'
      />

      <meta
        name='robots'
        content={noindex ? 'noindex, nofollow' : 'index,follow'}
      />
      <meta property='og:type' content='website' />
      <meta property='og:site_name' content={config.name} />
      <meta property='twitter:domain' content={config.domain} />

      <meta name='description' content={description} />
      <meta property='og:description' content={description} />
      <meta name='twitter:description' content={description} />

      {socialImageUrl ? (
        <>
          <meta name='twitter:card' content='summary_large_image' />
          <meta name='twitter:image' content={socialImageUrl} />
          <meta property='og:image' content={socialImageUrl} />
          <meta property='og:image:type' content='image/png' />
          <meta property='og:image:width' content='1200' />
          <meta property='og:image:height' content='630' />
          <meta property='og:image:alt' content={socialTitle ?? config.name} />
        </>
      ) : (
        <meta name='twitter:card' content='summary' />
      )}

      <link rel='canonical' href={url} />
      <meta property='og:url' content={url} />
      <meta property='twitter:url' content={url} />

      <meta property='og:title' content={title} />
      <meta name='twitter:title' content={title} />
      <title>{title}</title>

      {children}
    </Head>
  )
}
