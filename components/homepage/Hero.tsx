import Link from 'next/link'

import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.inner}>
        <h1 id="hero-heading" className={styles.heading}>
          Technology for All:{' '}
          <span className={styles.accent}>Access Made Easy</span>
        </h1>

        <p className={styles.subtext}>
          Free guides and resources to help you and your family get internet,
          phones, food benefits, electric vehicles, and more &mdash; all in
          plain language.
        </p>

        <Link href="#guides" className={styles.cta}>
          Explore Our Guides
          <span className={styles.ctaArrow} aria-hidden="true">
            &darr;
          </span>
        </Link>
      </div>
    </section>
  )
}
