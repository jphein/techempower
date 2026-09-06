import resourceSlugLockfile from '@/lib/data/resource-slug-lockfile.json'

// One honest program count for the homepage (Hero + ResourcesPreview).
//
// The slug lockfile is the sitemap truth: it keeps a slug for every resource
// that ever had a page, including rows since retired from the catalog, so old
// links keep resolving. The live Notion collection is the display truth and
// runs a little lower (site review 2026-09-05: 273 slugs vs 256 cards on
// /resources). Neither number is worth promising to the unit, so round the
// lockfile length DOWN to the nearest 50 and say "+": "250+" is true of both
// and only changes when the catalog genuinely grows.
const ROUND_TO = 50

export const RESOURCE_COUNT_LABEL = `${
  Math.floor(Object.keys(resourceSlugLockfile).length / ROUND_TO) * ROUND_TO
}+`
