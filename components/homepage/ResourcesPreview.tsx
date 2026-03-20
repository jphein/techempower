import Link from 'next/link'

import styles from './ResourcesPreview.module.css'

export function ResourcesPreview() {
  return (
    <section
      id="resources"
      className={styles.section}
      aria-labelledby="resources-heading"
    >
      <div className={styles.inner}>
        <h2 id="resources-heading" className={styles.heading}>
          Resources Database
        </h2>
        <p className={styles.subtitle}>
          Search and filter hundreds of free programs — sorted by subject,
          eligibility, and more.
        </p>

        <div className={styles.highlights}>
          <div className={styles.chip}>
            <span aria-hidden="true">📶</span> Internet &amp; Phone
          </div>
          <div className={styles.chip}>
            <span aria-hidden="true">🍎</span> Food Benefits
          </div>
          <div className={styles.chip}>
            <span aria-hidden="true">⚡</span> Utilities
          </div>
          <div className={styles.chip}>
            <span aria-hidden="true">🏥</span> Healthcare
          </div>
          <div className={styles.chip}>
            <span aria-hidden="true">🏠</span> Housing
          </div>
          <div className={styles.chip}>
            <span aria-hidden="true">🚗</span> Transportation
          </div>
        </div>

        <Link href="/resources" className={styles.cta}>
          Browse All Resources
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
    </section>
  )
}
