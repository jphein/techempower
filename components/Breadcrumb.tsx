import Head from 'next/head'
import Link from 'next/link'
import * as React from 'react'

import * as config from '@/lib/config'

import styles from './Breadcrumb.module.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

/**
 * Breadcrumb navigation with semantic HTML and JSON-LD structured data.
 *
 * Renders: Home > Guides > [Title]
 *
 * Uses <nav> with aria-label, <ol> for ordered list semantics, and injects a
 * JSON-LD BreadcrumbList for search engine rich results.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items.length) {
    return null
  }

  // Build JSON-LD BreadcrumbList
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${config.host}${item.href}` } : {})
    }))
  }

  return (
    <>
      <Head>
        <script type='application/ld+json'>{JSON.stringify(jsonLd)}</script>
      </Head>

      <nav aria-label='Breadcrumb' className={styles.nav}>
        <ol className={styles.list}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            return (
              <li key={index} className={styles.item}>
                {index > 0 && (
                  <span className={styles.separator} aria-hidden='true'>
                    {'\u203A'}
                  </span>
                )}

                {isLast || !item.href ? (
                  <span
                    className={styles.current}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

// ---------------------------------------------------------------------------
// Helper to build the standard guide breadcrumb trail
// ---------------------------------------------------------------------------

/**
 * Build a breadcrumb items array for a guide page.
 *
 * Returns: [Home (/), Guides (/), Current Title (no link)]
 */
export function buildGuideBreadcrumb(title: string): BreadcrumbItem[] {
  return [{ label: 'Home', href: '/' }, { label: 'Guides' }, { label: title }]
}
