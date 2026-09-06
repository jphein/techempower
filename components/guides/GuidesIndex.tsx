import Head from 'next/head'
import Link from 'next/link'

import { GUIDE_CARDS, GuideCards } from '@/components/homepage/GuideGrid'
import { QualifyCallout } from '@/components/homepage/QualifyCallout'
import * as config from '@/lib/config'

import styles from './GuidesIndex.module.css'

// /guides — the index the homepage grid never had. Same eight cards as the
// homepage (GuideCards), under a real h1 so "Guides" in the nav goes somewhere
// and search engines get a page to rank for the collection.

export function GuidesIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'TechEMPOWER.org guides',
    itemListElement: GUIDE_CARDS.map((guide, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: guide.title,
      url: `https://${config.domain}/guides/${guide.slug}`
    }))
  }

  return (
    <>
      <Head>
        <script type='application/ld+json'>{JSON.stringify(jsonLd)}</script>
      </Head>

      <main id='main-content'>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>Guides</p>
            <h1 className={styles.heading}>Step-by-step guides</h1>
            <p className={styles.lede}>
              Eight plain-English walkthroughs of programs that lower the cost
              of internet, phone service, food, and getting around. Each one
              tells you who qualifies, exactly what to do, and who to call if
              you get stuck. Free to read, no sign-up.
            </p>
          </div>
        </header>

        <section className={styles.section} aria-label='All guides'>
          <div className={styles.inner}>
            <GuideCards />
            <p className={styles.more}>
              Looking for a specific program? Every free program we know about
              is in the <Link href='/resources'>resource directory</Link>,
              searchable by topic and county.
            </p>
          </div>
        </section>

        <QualifyCallout />
      </main>
    </>
  )
}
