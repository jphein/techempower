import { type NextApiRequest, type NextApiResponse } from 'next'

import { getPage } from '../../lib/notion'
import { RESOURCES_PAGE } from '../../lib/page-ids'

/**
 * Returns the full resources page recordMap (all rows, no limit).
 * Called client-side after the initial 50-row SSR load when the
 * user wants to browse all resources.
 */
export default async function resourcesMore(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const recordMap = await getPage(RESOURCES_PAGE, {
      enableGalleryCovers: true
    })

    // Cache aggressively — same policy as the resources page itself
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=43200, max-age=60, stale-while-revalidate=604800'
    )
    res.status(200).json({ recordMap })
  } catch (err) {
    console.error('resources-more error', err)
    res.status(500).json({ error: 'Failed to load resources' })
  }
}
