import ExpiryMap from 'expiry-map'
import NProgress from 'nprogress'
import pMemoize from 'p-memoize'

import type * as types from './types'
import { api } from './config'

export const searchNotion = pMemoize(searchNotionImpl, {
  cacheKey: (args) => args[0]?.query,
  cache: new ExpiryMap(10_000)
})

async function searchNotionImpl(
  params: types.SearchParams
): Promise<types.SearchResults> {
  NProgress.start()
  try {
    const res = await fetch(api.searchNotion, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'content-type': 'application/json'
      }
    })

    if (!res.ok) {
      const error: any = new Error(res.statusText)
      error.response = res
      throw error
    }

    return (await res.json()) as types.SearchResults
  } finally {
    NProgress.done()
  }
}
