import type { GetServerSideProps } from 'next'

import type { SiteMap } from '@/lib/types'
import { host, pageUrlOverrides } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()
    return {
      props: {}
    }
  }

  const siteMap = await getSiteMap()

  // cache for up to 8 hours
  res.setHeader(
    'Cache-Control',
    'public, max-age=28800, stale-while-revalidate=28800'
  )
  res.setHeader('Content-Type', 'text/xml')
  res.write(createSitemap(siteMap))
  res.end()

  return {
    props: {}
  }
}

const createSitemap = (siteMap: SiteMap) => {
  // Collect all canonical page paths from the site map
  const canonicalPaths = new Set(Object.keys(siteMap.canonicalPageMap))

  // Ensure all pageUrlOverrides are included even if the Notion crawl
  // did not discover them (e.g. pages deeper than maxDepth)
  for (const overridePath of Object.keys(pageUrlOverrides)) {
    canonicalPaths.add(overridePath)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${host}</loc>
    </url>

    ${Array.from(canonicalPaths)
      .map(
        (pagePath) =>
          `
          <url>
            <loc>${host}/${pagePath}</loc>
          </url>
        `.trim()
      )
      .join('')}
  </urlset>
`
}

export default function noop() {
  return null
}
