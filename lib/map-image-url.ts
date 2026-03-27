import { type Block } from 'notion-types'
import { defaultMapImageUrl } from 'notion-utils'

import { defaultPageCover, defaultPageIcon } from './config'

export const mapImageUrl = (url: string | undefined, block: Block) => {
  // Strip wrapping quotes from URLs stored with quotes in Notion (e.g. "'https://...'")
  if (
    url &&
    ((url.startsWith("'") && url.endsWith("'")) ||
      (url.startsWith('"') && url.endsWith('"')))
  ) {
    url = url.slice(1, -1)
  }
  if (!url) return null as any

  if (url === defaultPageCover || url === defaultPageIcon) {
    return url
  }

  return defaultMapImageUrl(url, block)
}
