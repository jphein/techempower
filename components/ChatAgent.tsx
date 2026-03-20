import * as React from 'react'

import styles from './ChatAgent.module.css'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatAgentProps {
  onSendMessage: (
    message: string,
    history: ChatMessage[]
  ) => AsyncGenerator<string> | Promise<string>
  onAuthRequired?: () => Promise<void>
}

export function ChatAgent({ onSendMessage, onAuthRequired }: ChatAgentProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus textarea when panel opens
  React.useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Escape to close
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Auto-resize textarea
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      // Cap at ~3 lines (roughly 72px)
      el.style.height = `${Math.min(el.scrollHeight, 72)}px`
    },
    []
  )

  const handleSend = React.useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const updatedHistory = [...messages, userMessage]

    setMessages(updatedHistory)
    setInput('')
    setIsStreaming(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const result = onSendMessage(trimmed, updatedHistory)

      // Check if the result is an AsyncGenerator
      if (
        result &&
        typeof result === 'object' &&
        Symbol.asyncIterator in result
      ) {
        const generator = result as AsyncGenerator<string>
        let accumulated = ''

        // Add placeholder assistant message
        const assistantMessage: ChatMessage = { role: 'assistant', content: '' }
        setMessages([...updatedHistory, assistantMessage])

        for await (const chunk of generator) {
          accumulated += chunk
          setMessages([
            ...updatedHistory,
            { role: 'assistant', content: accumulated }
          ])
        }
      } else {
        // It's a Promise<string>
        const response = await (result as Promise<string>)
        setMessages([
          ...updatedHistory,
          { role: 'assistant', content: response }
        ])
      }
    } catch (err) {
      // If auth is required, call the auth handler
      if (
        onAuthRequired &&
        err instanceof Error &&
        err.message.includes('auth')
      ) {
        await onAuthRequired()
      } else {
        setMessages([
          ...updatedHistory,
          {
            role: 'assistant',
            content:
              'Sorry, something went wrong. Please try again in a moment.'
          }
        ])
      }
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, messages, onSendMessage, onAuthRequired])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  const toggleOpen = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      {/* Floating toggle button */}
      <button
        type='button'
        className={styles.floatingButton}
        onClick={toggleOpen}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={isOpen}
        aria-controls='chat-agent-panel'
      >
        {isOpen ? (
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
          >
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
        ) : (
          <svg
            width='26'
            height='26'
            viewBox='0 0 24 24'
            fill='currentColor'
            aria-hidden='true'
          >
            <path d='M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z' />
            <circle cx='8' cy='10' r='1.2' />
            <circle cx='12' cy='10' r='1.2' />
            <circle cx='16' cy='10' r='1.2' />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        id='chat-agent-panel'
        ref={panelRef}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        role='dialog'
        aria-label='Chat with TechEmpower Assistant'
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>TechEmpower Assistant</h2>
          <button
            type='button'
            className={styles.closeButton}
            onClick={handleClose}
            aria-label='Close chat'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* Messages area */}
        <div className={styles.messages} role='log' aria-live='polite'>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <p>
                Hi! I can help you find free resources for technology, internet
                access, and digital skills training. What are you looking for?
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.bubble} ${
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
              }`}
            >
              <div className={styles.bubbleContent}>{msg.content}</div>
            </div>
          ))}

          {isStreaming &&
            (messages.length === 0 ||
              messages.at(-1)?.role !== 'assistant' ||
              messages.at(-1)?.content === '') && (
              <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                <div className={styles.typingIndicator} aria-label='Typing'>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder='Type your message...'
            rows={1}
            disabled={isStreaming}
            aria-label='Chat message input'
          />
          <button
            type='button'
            className={styles.sendButton}
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            aria-label='Send message'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
