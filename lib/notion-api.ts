import { NotionAPI } from 'notion-client'

export const notion = new NotionAPI({
  apiBaseUrl: process.env.NOTION_API_BASE_URL,
  // Notion's edge returns 403 to Node's default fetch User-Agent ("node"),
  // which made every Notion page 404 in `pnpm dev`. Production on Workers
  // sends a different UA and never hit it. Any real-looking UA passes.
  ofetchOptions: {
    headers: {
      'user-agent':
        'Mozilla/5.0 (compatible; TechEMPOWER.org; +https://techempower.org)'
    }
  }
})
