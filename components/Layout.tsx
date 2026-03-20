import * as React from 'react'

import { Footer } from './Footer'
import { Header } from './Header'
import styles from './Layout.module.css'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.page}>
      <a href='#main-content' className={styles.skipLink}>
        Skip to main content
      </a>

      <Header />

      <div id='main-content' className={styles.main}>
        {children}
      </div>

      <Footer />
    </div>
  )
}
