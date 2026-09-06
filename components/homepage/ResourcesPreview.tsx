import Link from 'next/link'

import { RESOURCE_COUNT_LABEL } from './resourceCount'
import styles from './ResourcesPreview.module.css'

export function ResourcesPreview() {
  return (
    <section
      id='resources'
      className={styles.section}
      aria-labelledby='resources-heading'
    >
      <div className={styles.inner}>
        <h2 id='resources-heading' className={styles.heading}>
          Search all free programs
        </h2>
        <p className={styles.subtitle}>
          <strong>{RESOURCE_COUNT_LABEL} free programs</strong>, searchable and
          filterable — by topic, who qualifies, and where you live. Every
          listing is hand-checked against the program&rsquo;s official source.
        </p>

        <div className={styles.highlights}>
          <div className={styles.chip}>
            <span aria-hidden='true'>📶</span> Internet &amp; Phone
          </div>
          <div className={styles.chip}>
            <span aria-hidden='true'>🍎</span> Food Benefits
          </div>
          <div className={styles.chip}>
            <span aria-hidden='true'>⚡</span> Utilities
          </div>
          <div className={styles.chip}>
            <span aria-hidden='true'>🏥</span> Healthcare
          </div>
          <div className={styles.chip}>
            <span aria-hidden='true'>🏠</span> Housing
          </div>
          <div className={styles.chip}>
            <span aria-hidden='true'>🚗</span> Transportation
          </div>
        </div>

        <Link href='/resources' className={styles.cta}>
          Browse all programs
          <span aria-hidden='true'> →</span>
        </Link>

        <p className={styles.submitHint}>
          Know a free program we don&rsquo;t list yet?{' '}
          <Link href='/submit' className={styles.submitLink}>
            Submit it<span aria-hidden='true'> →</span>
          </Link>
        </p>
      </div>
    </section>
  )
}
