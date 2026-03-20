/**
 * Puter.js AI chat integration for TechEmpower.
 *
 * Loads the Puter.js SDK via script tag, handles authentication, and exposes a
 * streaming chat function powered by Claude that acts as a helpful assistant
 * for people seeking free resources in Nevada County, California.
 *
 * This module is client-side only — all functions guard against SSR.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ---------------------------------------------------------------------------
// Puter.js Script Loader
// ---------------------------------------------------------------------------

/** Cached promise so the script is loaded at most once. */
let loaderPromise: Promise<void> | null = null

/**
 * Dynamically injects the Puter.js v2 script tag and resolves once the
 * `puter` global is available. Subsequent calls return the same promise.
 */
export function loadPuter(): Promise<void> {
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise<void>((resolve, reject) => {
    // SSR guard
    if (typeof window === 'undefined') {
      reject(new Error('Puter.js can only be loaded in the browser.'))
      return
    }

    // Already loaded (e.g. included in HTML <head>)
    if ((window as any).puter) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://js.puter.com/v2/'
    script.async = true

    script.addEventListener('load', () => {
      // The script may need a tick to initialise the global
      if ((window as any).puter) {
        resolve()
      } else {
        // Poll briefly in case initialisation is async
        let attempts = 0
        const interval = setInterval(() => {
          attempts++
          if ((window as any).puter) {
            clearInterval(interval)
            resolve()
          } else if (attempts >= 50) {
            // 50 × 100 ms = 5 s
            clearInterval(interval)
            reject(
              new Error(
                'Puter.js script loaded but the global object was not initialised.'
              )
            )
          }
        }, 100)
      }
    })

    script.addEventListener('error', () => {
      // Allow a retry on the next call
      loaderPromise = null
      reject(
        new Error(
          'Failed to load Puter.js. The script may be blocked by an ad-blocker or network issue.'
        )
      )
    })

    document.head.append(script)
  })

  return loaderPromise
}

// ---------------------------------------------------------------------------
// Authentication Helper
// ---------------------------------------------------------------------------

/**
 * Ensures the current user is signed into Puter.
 *
 * If the user is not authenticated, `puter.auth.signIn()` is called which
 * opens the Puter sign-in dialog. Returns `true` when authenticated, `false`
 * if authentication could not be completed.
 */
export async function ensurePuterAuth(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    await loadPuter()
    const puter = (window as any).puter

    if (!puter) return false

    const signedIn = await puter.auth.isSignedIn()
    if (signedIn) return true

    // Prompt the user to sign in
    await puter.auth.signIn()

    // Verify sign-in succeeded
    return await puter.auth.isSignedIn()
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are TechEmpower's friendly assistant. TechEmpower is a nonprofit that helps people with low income find free technology resources and programs in Nevada County, California.

IMPORTANT RULES:
- Use simple, plain language a 5th-grader could understand. Many people you help may not be comfortable with technology.
- Be warm and encouraging. Never talk down to anyone.
- Keep your answers short — two to three short paragraphs at most.
- If someone asks about something outside of TechEmpower's services, politely let them know you can only help with free resources and programs, and suggest they call 2-1-1 for other local help.

GUIDES YOU KNOW ABOUT (always link using these exact paths):
- /guides/how-to-use-techempower — How to Use TechEmpower.org (start here for new visitors)
- /guides/free-internet — Free Internet Options (low-cost and no-cost internet programs)
- /guides/ev-incentives — EV & Plug-in Hybrid Incentives (money-saving programs for electric vehicles)
- /guides/ebt-balance — Check Your EBT Balance (how to see how much is on your EBT card)
- /guides/ebt-spending — Best Places to Spend EBT (where and what you can buy with EBT / SNAP)
- /guides/findhelp — findhelp.org (search engine for free and reduced-cost services near you)
- /guides/password-manager — Password Manager Guide (keep your accounts safe with a free tool)
- /guides/free-cell-service — Free Cell Service & Smartphone (get a free government phone and plan)

OTHER RESOURCES:
- /resources — the full searchable database of free resources

TIPS:
- When a guide matches someone's question, include the link so they can read more.
- Mention that anyone can call 2-1-1 for free, personalized help finding local services.
- For the full list of resources, point people to /resources.`

// ---------------------------------------------------------------------------
// Context: Resource Search
// ---------------------------------------------------------------------------

const SEARCH_API = '/api/search-notion'
const ROOT_PAGE_ID = '0959e44599984143acabc80187305001'

/**
 * Searches the TechEmpower Notion database for resources matching a query.
 * Returns a compact text summary suitable for injecting into chat context.
 * Fails silently — returns empty string if search is unavailable.
 */
async function fetchResourceContext(query: string): Promise<string> {
  try {
    const res = await fetch(SEARCH_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ancestorId: ROOT_PAGE_ID,
        query,
        filters: { excludeTemplates: true, isNavigableOnly: true },
        limit: 6
      })
    })

    if (!res.ok) return ''

    const data = (await res.json()) as {
      results?: Array<{ highlight?: { text?: string; pathText?: string } }>
    }
    const results = data?.results ?? []

    if (results.length === 0) return ''

    const lines = results
      .map((r) => {
        const path = r.highlight?.pathText ?? ''
        const snippet = r.highlight?.text?.replaceAll(/<\/?gzkNfoUU>/g, '') ?? ''
        return path || snippet ? `- ${path}: ${snippet}` : null
      })
      .filter(Boolean)

    if (lines.length === 0) return ''

    return `\n\nRELEVANT RESOURCES FROM THE DATABASE (use these to help answer):\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

/**
 * Returns a string describing which page the visitor is currently viewing.
 */
function getPageContext(): string {
  if (typeof window === 'undefined') return ''

  const path = window.location.pathname
  const title = document.title

  if (path === '/') return '\n\nThe visitor is currently on the homepage.'

  return `\n\nThe visitor is currently viewing: "${title}" (${path})`
}

// ---------------------------------------------------------------------------
// Chat Function (Streaming)
// ---------------------------------------------------------------------------

const MODEL = 'anthropic/claude-opus-4-6'

/**
 * Streams an AI response for the given user message and conversation history.
 *
 * Yields text chunks as they arrive. If streaming is unavailable the full
 * response is yielded in a single chunk. On any error a user-friendly message
 * is yielded instead of throwing.
 */
export async function* streamChat(
  message: string,
  history: ChatMessage[]
): AsyncGenerator<string> {
  // ---- Pre-flight checks --------------------------------------------------

  if (typeof window === 'undefined') {
    yield 'Sorry, the chat assistant is only available in your browser.'
    return
  }

  try {
    await loadPuter()
  } catch (err: any) {
    yield `I'm having trouble loading the chat service. ${err?.message ?? 'Please try again later.'}`
    return
  }

  const authed = await ensurePuterAuth()
  if (!authed) {
    yield 'To use the chat assistant, please sign in to Puter when prompted. You can try again whenever you are ready.'
    return
  }

  const puter = (window as any).puter
  if (!puter?.ai?.chat) {
    yield 'The chat service is not available right now. Please try again later.'
    return
  }

  // ---- Gather dynamic context (page + resource search in parallel) --------

  const pageContext = getPageContext()
  const resourceContext = await fetchResourceContext(message)

  // ---- Build messages array -----------------------------------------------

  const systemPrompt = SYSTEM_PROMPT + pageContext + resourceContext

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  // ---- Attempt streaming call ---------------------------------------------

  try {
    const response = await puter.ai.chat(messages, {
      model: MODEL,
      stream: true
    })

    // Puter's streaming response is an async iterable of chunks
    if (response && typeof response[Symbol.asyncIterator] === 'function') {
      for await (const chunk of response) {
        // The chunk shape may vary; extract text content
        const text =
          chunk?.text ??
          chunk?.message?.content ??
          (typeof chunk === 'string' ? chunk : null)

        if (text) {
          yield text
        }
      }
      return
    }

    // If the response is not async-iterable, treat it as a non-streaming
    // response (fallback).
    const fallbackText =
      response?.message?.content ??
      response?.text ??
      (typeof response === 'string' ? response : null)

    if (fallbackText) {
      yield fallbackText
      return
    }

    yield 'I was unable to get a response. Please try again.'
  } catch {
    // ---- Fallback to non-streaming call -----------------------------------
    try {
      const fallback = await puter.ai.chat(messages, {
        model: MODEL,
        stream: false
      })

      const text =
        fallback?.message?.content ??
        fallback?.text ??
        (typeof fallback === 'string' ? fallback : null)

      if (text) {
        yield text
        return
      }

      yield 'I was unable to get a response. Please try again.'
    } catch {
      yield `Something went wrong while connecting to the assistant. Please try again in a moment.`
    }
  }
}
