import Link from 'next/link'
import * as React from 'react'

import { type GuideMeta } from '@/lib/page-ids'

import styles from './RelatedGuides.module.css'

interface RelatedGuidesProps {
  guides: GuideMeta[]
}

/**
 * Renders a grid of related guide cards with icons, titles, and summaries.
 *
 * Each card links to its guide page using the slug-based URL.
 */
export function RelatedGuides({ guides }: RelatedGuidesProps) {
  if (!guides.length) {
    return null
  }

  return (
    <section className={styles.section} aria-label='Related guides'>
      <h2 className={styles.heading}>Related Guides</h2>

      <div className={styles.grid}>
        {guides.map((guide) => (
          <Link
            key={guide.id}
            href={`/guides/${guide.slug}`}
            className={styles.card}
          >
            <span className={styles.icon} aria-hidden='true'>
              {guide.icon}
            </span>

            <div className={styles.cardBody}>
              <h3 className={styles.title}>{guide.title}</h3>
              <p className={styles.summary}>{guide.summary}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
