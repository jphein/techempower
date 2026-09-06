import { describe, expect, it } from 'vitest'

import {
  buildSitemapPaths,
  SITEMAP_EXCLUDED_PATHS,
  STATIC_SITEMAP_PATHS
} from '@/lib/sitemap-paths'

describe('buildSitemapPaths', () => {
  it('puts the React pages first, then the Notion overrides', () => {
    const paths = buildSitemapPaths(['about', 'some-resource'])
    expect(paths.slice(0, STATIC_SITEMAP_PATHS.length)).toEqual([
      ...STATIC_SITEMAP_PATHS
    ])
    expect(paths).toContain('about')
    expect(paths).toContain('some-resource')
  })

  it('includes every React page the audit asked for (issue #126, C2)', () => {
    const paths = buildSitemapPaths([])
    for (const p of ['qualify', 'donate', 'show', 'guides', 'candela']) {
      expect(paths).toContain(p)
    }
  })

  it('dedupes paths that are both static and overrides', () => {
    const paths = buildSitemapPaths(['donate', 'show', 'candela', 'about'])
    expect(paths.filter((p) => p === 'donate')).toHaveLength(1)
    expect(paths.filter((p) => p === 'show')).toHaveLength(1)
    expect(paths.filter((p) => p === 'candela')).toHaveLength(1)
  })

  it('excludes noindex and redirected pages even when an override exists', () => {
    const paths = buildSitemapPaths([
      'submit',
      'welcome-to-techempowerorg',
      'about'
    ])
    expect(paths).not.toContain('submit')
    expect(paths).not.toContain('welcome-to-techempowerorg')
    expect(paths).toContain('about')
    expect(SITEMAP_EXCLUDED_PATHS.has('submit')).toBe(true)
  })

  it('normalises leading slashes and drops empties', () => {
    const paths = buildSitemapPaths([
      '/about',
      '//guides/ev-incentives',
      '',
      '/'
    ])
    expect(paths).toContain('about')
    expect(paths).toContain('guides/ev-incentives')
    expect(paths).not.toContain('')
    expect(paths.every((p) => !p.startsWith('/'))).toBe(true)
  })

  it('honours custom extra + excluded sets', () => {
    const paths = buildSitemapPaths(['a', 'b'], ['x'], new Set(['b']))
    expect(paths).toEqual(['x', 'a'])
  })
})
