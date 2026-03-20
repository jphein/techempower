import { type ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

/**
 * Find block IDs of Spanish-language callout blocks in a Notion recordMap.
 *
 * Identifies callouts that contain the Mexican flag emoji (🇲🇽) — these
 * are the Spanish translation sections in TechEmpower's guide pages.
 *
 * Returns an array of block IDs (may be empty if no Spanish content exists).
 */
export function findSpanishBlockIds(recordMap: ExtendedRecordMap): string[] {
  const ids: string[] = []

  for (const [blockId, recordValue] of Object.entries(recordMap.block)) {
    const block = getBlockValue(recordValue)
    if (!block) continue

    // Look for callout blocks
    if (block.type === 'callout') {
      // Check if the block's text content contains the Mexican flag emoji
      const titleChunks = block.properties?.title
      if (!titleChunks) continue

      const text = titleChunks.map((chunk: any[]) => chunk[0]).join('')
      if (text.includes('\uD83C\uDDF2\uD83C\uDDFD') || text.includes('🇲🇽')) {
        ids.push(blockId)
      }
    }
  }

  return ids
}
