import Link from 'next/link'

import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.inner}>
        <div className={styles.badge}>
          Free for everyone &middot; No sign-up needed
        </div>

        <h1 id="hero-heading" className={styles.heading}>
          Your guide to{' '}
          <span className={styles.accent}>free resources</span>{' '}
          you deserve
        </h1>

        <p className={styles.subtext}>
          Internet, phones, food benefits, electric vehicles, and more &mdash;
          we break down every program in plain language so you and your family
          can get the help that&apos;s already waiting for you.
        </p>

        <Link href="#guides" className={styles.cta}>
          Find What You Need
          <span className={styles.ctaArrow} aria-hidden="true">
            &darr;
          </span>
        </Link>
      </div>
    </section>
  )
}
