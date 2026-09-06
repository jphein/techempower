import { describe, expect, it } from 'vitest'

import {
  isTransientNotionError,
  NotionTimeoutError,
  withNotionTimeout
} from '@/lib/notion'

/** Mimic ofetch's FetchError: status getters that read a (maybe absent) response. */
function fetchError(
  status: number | undefined,
  message: string,
  cause?: unknown
) {
  const err = new Error(message, cause ? { cause } : undefined)
  err.name = 'FetchError'
  const response = status === undefined ? undefined : { status }
  Object.defineProperty(err, 'status', { get: () => response?.status })
  Object.defineProperty(err, 'statusCode', { get: () => response?.status })
  Object.defineProperty(err, 'response', { get: () => response })
  return err
}

describe('isTransientNotionError', () => {
  it('treats our own timeout as transient', () => {
    expect(isTransientNotionError(new NotionTimeoutError(14_000))).toBe(true)
    // …and the same message arriving as a plain Error (older call sites).
    expect(
      isTransientNotionError(new Error('notion timeout after 8000ms'))
    ).toBe(true)
  })

  it('treats network-level failures (no HTTP response) as transient', () => {
    expect(
      isTransientNotionError(
        fetchError(
          undefined,
          '[POST] "https://www.notion.so/api/v3/loadPageChunk": <no response> fetch failed',
          new TypeError('fetch failed')
        )
      )
    ).toBe(true)
    expect(
      isTransientNotionError(
        Object.assign(new Error('read'), { code: 'ECONNRESET' })
      )
    ).toBe(true)
    expect(
      isTransientNotionError(
        Object.assign(new Error('x'), { code: 'UND_ERR_CONNECT_TIMEOUT' })
      )
    ).toBe(true)
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    expect(isTransientNotionError(abort)).toBe(true)
  })

  it('treats Notion 429 / 5xx as transient', () => {
    for (const status of [408, 429, 500, 502, 503, 504]) {
      expect(isTransientNotionError(fetchError(status, `HTTP ${status}`))).toBe(
        true
      )
    }
  })

  it('treats other HTTP 4xx as definitive (a real miss)', () => {
    for (const status of [400, 401, 403, 404, 410]) {
      expect(isTransientNotionError(fetchError(status, `HTTP ${status}`))).toBe(
        false
      )
    }
    // A 4xx with a scary-sounding message is still a definitive answer.
    expect(
      isTransientNotionError(fetchError(404, 'network path not found'))
    ).toBe(false)
  })

  it("treats notion-client's own not-found / invalid-id errors as definitive", () => {
    expect(
      isTransientNotionError(new Error('Notion page not found "abc123"'))
    ).toBe(false)
    expect(
      isTransientNotionError(new Error('invalid notion pageId "nope"'))
    ).toBe(false)
  })

  it('looks through `cause` for the underlying network error', () => {
    const wrapped = new Error('resolveCollectionSlug failed', {
      cause: Object.assign(new Error('socket'), { code: 'ETIMEDOUT' })
    })
    expect(isTransientNotionError(wrapped)).toBe(true)
  })

  it('is false for non-errors and unknown shapes', () => {
    expect(isTransientNotionError(undefined)).toBe(false)
    expect(isTransientNotionError(null)).toBe(false)
    expect(isTransientNotionError('boom')).toBe(false)
    expect(isTransientNotionError(new Error('something unrelated'))).toBe(false)
  })
})

describe('withNotionTimeout', () => {
  it('resolves with the value when the promise is fast', async () => {
    await expect(withNotionTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })

  it('rejects with NotionTimeoutError when the deadline passes', async () => {
    const never = new Promise<never>(() => {})
    const pending = withNotionTimeout(never, 10)
    await expect(pending).rejects.toBeInstanceOf(NotionTimeoutError)
    await expect(pending).rejects.toMatchObject({
      timeoutMs: 10,
      message: 'notion timeout after 10ms'
    })
  })

  it('propagates the inner rejection unchanged', async () => {
    const inner = new Error('Notion page not found "x"')
    await expect(withNotionTimeout(Promise.reject(inner), 1000)).rejects.toBe(
      inner
    )
  })
})
