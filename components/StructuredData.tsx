import Head from 'next/head'

import * as config from '@/lib/config'

export function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NonprofitOrganization',
    name: config.name,
    url: config.host,
    description: config.description,
    sameAs: [
      config.twitter ? `https://twitter.com/${config.twitter}` : null,
      config.github ? `https://github.com/${config.github}` : null,
      config.linkedin
        ? `https://www.linkedin.com/company/${config.linkedin}`
        : null,
      config.youtube
        ? `https://www.youtube.com/@${config.youtube}`
        : null
    ].filter(Boolean)
  }

  return (
    <Head>
      <script type='application/ld+json'>
        {JSON.stringify(jsonLd)}
      </script>
    </Head>
  )
}
