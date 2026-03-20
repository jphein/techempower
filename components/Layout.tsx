import dynamic from 'next/dynamic'
import * as React from 'react'

import { ensurePuterAuth, streamChat } from '@/lib/puter-chat'

import { Footer } from './Footer'
import { Header } from './Header'
import styles from './Layout.module.css'

const ChatAgent = dynamic(
  () => import('./ChatAgent').then((mod) => ({ default: mod.ChatAgent })),
  { ssr: false }
)

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

      <ChatAgent
        onSendMessage={streamChat}
        onAuthRequired={async () => void (await ensurePuterAuth())}
      />
    </div>
  )
}
