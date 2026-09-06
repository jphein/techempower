import Link from 'next/link'

import styles from './Hero.module.css'
import { RESOURCE_COUNT_LABEL } from './resourceCount'

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby='hero-heading'>
      <div className={styles.inner}>
        <div className={styles.badge}>
          Free for everyone &middot; No sign-up needed
        </div>

        <h1 id='hero-heading' className={styles.heading}>
          Free help with{' '}
          <span className={styles.accent}>internet, phones, </span>food, and
          more
        </h1>

        <p className={styles.subtext}>
          Real programs explained in plain words &mdash; free smartphones and
          phone plans through Lifeline, CalFresh food benefits, low-cost
          internet, and rebates for an electric car. No sign-up. No catch.
        </p>

        <div className={styles.ctaRow}>
          <Link href='#guides' className={styles.cta}>
            See the guides
            <span className={styles.ctaArrow} aria-hidden='true'>
              &darr;
            </span>
          </Link>
          <Link href='/resources' className={styles.ctaSecondary}>
            Browse {RESOURCE_COUNT_LABEL} programs
          </Link>
        </div>
      </div>
    </section>
  )
}
