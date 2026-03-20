import Link from 'next/link'
import * as React from 'react'

import * as config from '@/lib/config'

import styles from './Footer.module.css'

export function FooterImpl() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            <span aria-hidden="true">⚡</span> TechEmpower
          </Link>
          <p className={styles.tagline}>
            Technology for All: Access Made Easy
          </p>
        </div>

        <nav className={styles.links} aria-label="Footer navigation">
          <Link href="/" className={styles.link}>Guides</Link>
          <Link href="/resources" className={styles.link}>Resources</Link>
          <Link href="/about" className={styles.link}>About</Link>
          <Link href="/donate" className={styles.link}>Donate</Link>
          <Link href="/non-discrimination-policy" className={styles.link}>
            Non-Discrimination Policy
          </Link>
        </nav>

        <div className={styles.copyright}>
          &copy; {currentYear} {config.author}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export const Footer = React.memo(FooterImpl)
