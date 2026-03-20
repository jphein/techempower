# TechEmpower.org Notion Wrapper — Design Spec

> Custom frontend for techempower.org that uses Notion as a CMS.

**Date:** 2026-03-19
**Status:** Implemented (with deviations noted below)

> **Implementation notes (2026-03-20):** The site is live at techempower.org. Key
> deviations from this original spec:
> - **Hosting:** Vercel (SSR) instead of Cloudflare Pages (SSG). Vercel's native
>   Next.js support eliminated the need for `@cloudflare/next-on-pages` and
>   static export. SSR with CDN caching (`s-maxage=3600, stale-while-revalidate`)
>   replaces the planned cron-based rebuild strategy.
> - **Image handling:** Next.js `next/image` with Vercel's built-in image
>   optimization replaces the planned Cloudflare Pages Function image proxy.
> - **Resources page:** Rendered inline via react-notion-x Collection component
>   (not a redirect to Notion).
> - **Design system:** Warm earth-tone tokens (`--te-bark-*`, `--te-teal-*`,
>   `--te-amber-*`) with Fraunces/DM Sans typography. System-aware dark mode
>   with three-tier strategy (noflash script + React hook + matchMedia listener).
> - **Package manager:** pnpm (not npm).
>
> See the [readme](../../../readme.md) for current architecture documentation.

---

## 1. Problem

TechEmpower.org is a 501(c)(3) nonprofit site currently hosted as a Notion Site (*.notion.site). The custom domain feature requires a paid Notion add-on. Without a custom domain:

- Google Ad Grants ($10K/month in free search ads) cannot be activated
- The site cannot be submitted to search engines
- The URL lacks professional credibility for grant applications and partnerships

## 2. Solution

Build a Next.js application that pulls content from the TechEmpower Notion workspace and renders it as a standalone website at techempower.org. Notion remains the CMS — all content editing happens in Notion. The frontend renders it beautifully with a custom-designed homepage.

## 3. Architecture

```
Notion Workspace (CMS)
  - 8 Guides (published to web)
  - 246 Resources (published to web)
  - 3 About Us pages (published to web)
  - Ideas database (internal)
       |
       v (unofficial Notion API via notion-client)
       |
Next.js App (SSG — pure static export)
  - / .................. Custom homepage (React components)
  - /guides/[slug] ..... react-notion-x NotionRenderer
  - /about ............. react-notion-x + custom layout
  - /donate ............ react-notion-x + custom layout
  - /resources ......... Link to Notion DB view (Phase 1)
       |
       v (static build output via `next export`)
       |
Cloudflare Pages (free tier)
  - Unlimited bandwidth
  - Global CDN (300+ edge locations)
  - Free Web Analytics
  - Pages Functions (for image proxy Worker)
       |
       v (CNAME record)
       |
techempower.org (domain on Squarespace, DNS on Cloudflare)
```

## 4. Technology Choices

### 4.1 Content Renderer: react-notion-x

**Why:** Renders all Notion block types natively using Notion's internal data format. Handles callouts, tables, table of contents, embedded database views, checkboxes, toggles, synced blocks — everything the TechEmpower guides use.

**How it works:** The companion `notion-client` package fetches the full `recordMap` (Notion's internal page data) from publicly published pages. The `<NotionRenderer>` React component renders this data as HTML with Notion-faithful styling.

**Requirements:** All pages in the TechEmpower workspace must be published (shared to web). The content is public-facing, so this is appropriate.

**Trade-off:** Uses an unofficial API. This has been stable for years and Notion has no incentive to break public page access. Fallback: migrate to Super.so ($150/year) in a day if the API ever breaks.

### 4.2 Framework: Next.js (Pages Router, SSG)

**Why:**
- Static Site Generation (SSG) produces pre-rendered HTML — excellent for SEO
- Supports both static pages (guides, about) and a fully custom homepage
- Native React — works seamlessly with react-notion-x
- Largest ecosystem for Notion-as-CMS patterns

**Router:** Pages Router (not App Router). The `nextjs-notion-starter-kit` uses Pages Router, and `@cloudflare/next-on-pages` has better Pages Router support.

**No ISR — pure SSG with scheduled rebuilds.** Cloudflare Pages is a static hosting platform and does not natively support ISR (which requires a Node.js server with a persistent cache). Instead:
- All pages are statically generated at build time
- Content freshness is achieved via **scheduled rebuilds**: a GitHub Actions cron job triggers a Cloudflare Pages deploy hook every 30 minutes
- On-demand rebuilds can be triggered manually via the Cloudflare dashboard or by calling the deploy hook URL
- For 8 guides + 3 about pages + homepage, builds complete in under 2 minutes

**Starter kit:** `nextjs-notion-starter-kit` by the react-notion-x author provides a production-ready foundation with sitemap generation, RSS feed, social image generation, search, dark mode, and responsive design.

**Target Next.js version:** Match whatever version the starter kit uses (currently Next.js 13.x with Pages Router). Do not upgrade to Next.js 14+ App Router — unnecessary complexity for this project.

### 4.3 Hosting: Cloudflare Pages

**Why:**
- **Unlimited bandwidth** on free tier (all competitors cap at ~100 GB/month)
- DNS is already on Cloudflare — CNAME setup is trivial (same dashboard)
- Free Web Analytics (privacy-friendly, no cookie banner needed)
- 500 builds/month on free tier (more than sufficient)
- Cloudflare Workers available for server-side logic (image proxy, API routes)
- No ToS concerns for organizational/nonprofit use
- Best CDN performance (300+ global edge locations) — critical for users on slow connections

**Cost:** $0/year (on top of existing $10/year Cloudflare DNS).

**Alternative kept in reserve:** Azure Static Web Apps using the $2K/year nonprofit credits — available as a backup host if ever needed.

### 4.4 DNS Configuration

Current state: techempower.org DNS managed via Cloudflare, records point to Squarespace (unused).

Change required:
1. Remove existing A/AAAA/CNAME records pointing to Squarespace
2. Add CNAME: `techempower.org` → `<project>.pages.dev`
3. Cloudflare handles apex CNAME flattening automatically
4. SSL/HTTPS is automatic

## 5. Site Structure

### 5.1 Homepage (`/`)

Fully custom React page (NOT rendered from Notion). Designed for impact and accessibility.

**Sections:**
1. **Hero** — Tagline ("Technology for All: Access Made Easy"), brief mission statement, primary CTA
2. **Featured Guides** — Card grid showing the 8 guides with icons, titles, and one-line summaries
3. **Support channels** — Discord chat support callout, 211 phone support callout
4. **About/Donate** — Brief about section with donate CTA (PayPal Giving Fund link)
5. **Footer** — Contact (jp@techempower.org), non-discrimination policy link, copyright

**Design goals:**
- 6th-grade reading level (audience has limited tech literacy)
- Mobile-first responsive design
- WCAG 2.1 Level AA accessibility
- Fast load on slow connections (minimal JS, optimized images)
- Clear visual hierarchy — visitors should understand what TechEmpower offers within 5 seconds

### 5.2 Guide Pages (`/guides/[slug]`)

Rendered via react-notion-x with custom styling overrides.

**8 guides:**
| Slug | Title | Complexity |
|------|-------|------------|
| `how-to-use-techempower` | How to use TechEmpower.org | Short |
| `free-internet` | Free Internet Plus a Complete Overview | Very Long (7 tables) |
| `ev-incentives` | Electric Vehicle and Plug-in Hybrid Incentives | Medium (inline DB view) |
| `ebt-balance` | Check your EBT balance (Propel app) | Short |
| `ebt-spending` | My favorite places to spend EBT | Medium (2 tables) |
| `findhelp` | findhelp.org | Short |
| `password-manager` | Use a Positive Affirmation for Master Password | Medium (2 tables) |
| `free-cell-service` | Free Cell Service and Smartphone | Very Long (3 tables, TOC) |

**Block types that must render correctly:**
- Callouts (blue, yellow, gray, green, purple backgrounds with icons)
- Tables (fit-page-width, header rows — up to 7 per page, up to 11 rows)
- Table of contents (anchor-linked headings)
- Checkboxes / to-do lists
- Numbered and bulleted lists
- Blockquotes
- Horizontal rules
- Inline database views (EV guide has a filtered Resources view)
- Alias/synced blocks (EV guide has 7)
- Headings (H2, H3)
- Links (inline and standalone)

**Custom enhancements over raw Notion rendering:**
- **Spanish language toggle** at the top of each guide — identified by matching the purple-background callout block containing the Mexican flag emoji (🇲🇽). The build script extracts this block from the recordMap and moves it into a collapsible toggle component at the top of the page. If no matching block is found, no toggle is shown.
- **Breadcrumb navigation** (Home > Guides > [Guide Title])
- **Related guides** section rendered as linked cards (currently plain text links)
- **Brand styling** — custom colors, fonts, spacing applied via CSS overrides on react-notion-x's class names

### 5.3 About Pages

- `/about` — About the Founder (react-notion-x rendered)
- `/donate` — Donation page with PayPal link (react-notion-x rendered)
- `/non-discrimination-policy` — Legal text (react-notion-x rendered)
- `/privacy` — Privacy policy (static page, covers GA4 cookie usage and data handling)

### 5.4 Resources (Phase 1 — minimal)

For Phase 1, `/resources` redirects to the published Notion database view. A custom searchable/filterable resources page is planned for Phase 2.

### 5.5 Ideas Page

Internal only — not rendered on the public site.

## 6. Notion Page ID Mapping

The app needs a mapping from URL slugs to Notion page IDs:

```
Homepage:           0959e445-9998-4143-acab-c80187305001
Guides DB:          collection://62e593a5-07f4-4aeb-8803-29b72b663ee4
Resources DB:       collection://8cb5379d-fe78-4a15-9f3a-d539f5a60387
About Us DB:        collection://832b8fe1-c21c-46df-959d-7b65b93c0d76

Guide pages (slugs match Section 5.2):
  how-to-use-techempower: 6c979ba4-e43f-48d7-a483-6e0027ea4178
  free-internet:          bb5e537b-083a-417e-b90e-d9e984128c71
  ev-incentives:          758054e1-a2ec-4c1a-a077-202ffedec710
  ebt-balance:            272a4ee6-9520-804f-a68a-d8c110af49f6
  ebt-spending:           16f7018a-d935-4265-a2b2-16c44464b1c3
  findhelp:               992742a6-1e2e-472b-9b4a-149f7aa74539
  password-manager:       99b0ab9c-7cce-428e-8c86-e3143752aa1c
  free-cell-service:      7519ef16-d7b7-4519-acd9-b8262a7beb84

About pages:
  founder:          dbf0ddec-e2ce-468f-b2bf-9049e6322e8a
  donate:           59d8a4da-b0cc-484f-8b04-4d33f240ce1d
  non-discrimination: cdbe9906-ae24-41a1-a9bb-3aec601a5a6c
```

## 7. Image Handling

Notion serves images via S3 presigned URLs that expire after 1 hour. Since the site is pure SSG (no Next.js API routes on Cloudflare Pages), the image proxy is implemented as a **Cloudflare Pages Function** (runs on Workers):

- **Route:** `/functions/api/notion-image.js` — Cloudflare Pages auto-deploys files in `/functions` as Workers
- **Behavior:** Receives the Notion image URL as a query param, fetches the current signed URL from Notion, and returns the image
- **Caching:** Uses the Cloudflare Cache API to cache fetched images for 30 minutes, avoiding redundant requests to Notion's S3. Cache key is the Notion block ID (stable), not the presigned URL (ephemeral)
- **Fallback:** If Notion is unreachable, returns a placeholder SVG with the TechEmpower logo

The `nextjs-notion-starter-kit` has a built-in image proxy pattern that will be adapted for Cloudflare Pages Functions.

## 8. SEO

- **Sitemap** — auto-generated at `/sitemap.xml` listing all guide and about pages
- **robots.txt** — allow all crawlers
- **Meta tags** — custom title, description, Open Graph image per page (pulled from Notion properties: Name, Auto Summary)
- **Structured data** — Schema.org NonprofitOrganization markup on homepage
- **Google Search Console** — verify via DNS TXT record (Cloudflare)
- **Google Analytics** — required for Ad Grants tracking (in addition to Cloudflare Web Analytics)

## 9. Accessibility

Target: WCAG 2.1 Level AA

- Sufficient color contrast (4.5:1 ratio minimum)
- Keyboard navigable
- Semantic HTML (proper heading hierarchy)
- Alt text on images
- Skip-to-content link
- Focus indicators
- Mobile-responsive (tested on 320px width and up)

## 10. Performance

Target: Lighthouse score 90+ across all categories.

- Static HTML via SSG — no server rendering at request time
- Minimal JavaScript (react-notion-x renders to static HTML, interactivity only for toggles/search)
- Images served via the Cloudflare Pages Function proxy (Section 7). Use standard `<img>` tags with proxy URLs or `next/image` with `images.unoptimized: true` in `next.config.js` (required for `next export`). Cloudflare's automatic compression handles optimization at the CDN edge.
- Cloudflare CDN edge caching
- Brotli compression (automatic on Cloudflare)

## 11. Error Handling

**Build-time failures:**
- If Notion is unreachable during build, the build fails. Cloudflare Pages retains the last successful deployment — visitors continue seeing the previous version.
- If a page ID is invalid (page deleted/moved), the build logs the error and skips that page. Remaining pages are still built.
- Rate limiting from the unofficial API is unlikely (no hard rate limits on public page access), but fetches are done sequentially with a 200ms delay between pages as a precaution.

**Runtime errors:**
- 404: Custom 404 page with navigation back to homepage and a search bar.
- Image proxy failures: Returns a placeholder SVG with the TechEmpower logo (see Section 7).
- Notion outage: Does not affect the live site — all pages are pre-built static HTML. Only rebuilds are affected.

**Build scope:** Only guide pages (8) and about pages (3) are fetched during build. The 246 resources are NOT fetched in Phase 1 (resources page redirects to Notion). Build time is estimated at under 2 minutes.

## 12. Configuration

### Environment Variables

| Variable | Required | Where Used | Example |
|----------|----------|------------|---------|
| `NOTION_ROOT_PAGE_ID` | Yes | Build | `0959e445-9998-4143-acab-c80187305001` |
| `NEXT_PUBLIC_GA_TRACKING_ID` | Yes | Runtime (client) | `G-XXXXXXXXXX` |
| `CLOUDFLARE_DEPLOY_HOOK_URL` | Yes | GitHub Actions cron | `https://api.cloudflare.com/...` |

Page IDs for guides and about pages are hardcoded in a `site.config.ts` file (not env vars) since they rarely change and are not secrets.

### Local Development

Prerequisites: Node.js 18+, npm.

```
git clone <repo> && cd techempower
npm install
npm run dev    # starts Next.js dev server at localhost:3000
```

No `.env.local` file needed for basic development — the app fetches public Notion pages directly. Add `NEXT_PUBLIC_GA_TRACKING_ID` to `.env.local` only if testing analytics.

**Image proxy in local dev:** The Cloudflare Pages Function (image proxy) does not run under the standard Next.js dev server. During local development, images load directly from Notion's S3 URLs (which work for ~1 hour). For extended local testing of the image proxy, use `wrangler pages dev` to run the full Pages Functions stack locally.

## 13. Testing Strategy

- **Lighthouse CI** — run in GitHub Actions on every push. Fail the build if any score drops below 85.
- **Accessibility** — axe-core checks via `@axe-core/cli` on all built pages. Zero critical/serious violations required.
- **Visual smoke test** — after each build, verify all 8 guide pages and 3 about pages return 200 status with non-empty HTML bodies.
- **Link checking** — `linkinator` or similar tool scans all internal links post-build. No broken links allowed.
- **Manual testing** — verify each Notion block type renders correctly on the 2 most complex guides (Free Internet, Free Cell Service) after any dependency upgrade.

## 14. CI/CD Pipeline

**Repository:** GitHub (public or private, TBD).

**Branch strategy:** `main` = production. Feature branches for development, merge via PR.

**Cloudflare Pages build configuration:**
- Build command: `npm run build && npm run export` (or `next build && next export`)
- Output directory: `out` (plain Next.js static export — `@cloudflare/next-on-pages` is NOT needed since there is no SSR/ISR)
- Node.js version: 18
- Environment variables: set in Cloudflare Pages dashboard (not committed to repo)

**Automated rebuilds:** GitHub Actions workflow with cron schedule (`*/30 * * * *`) calls the Cloudflare deploy hook URL to trigger a rebuild every 30 minutes. This ensures Notion content changes appear within 30 minutes.

**Preview deployments:** Cloudflare Pages auto-deploys preview URLs for every PR branch.

## 15. Content Workflow

1. JP edits content in Notion (guides, about pages)
2. Within 30 minutes, the GitHub Actions cron triggers a rebuild
3. Cloudflare Pages builds and deploys the updated static site
4. Changes are live at techempower.org

For urgent updates: manually trigger a rebuild via the Cloudflare dashboard or by calling the deploy hook URL.

No approval step — JP is the sole content editor. If collaborators are added in the future, Notion's built-in page locking can serve as a review gate.

## 16. Google Ad Grants Compliance

**GA4 setup:**
- Create a GA4 property (not Universal Analytics — sunset)
- Install via Google Tag Manager (GTM) for flexibility
- GTM container ID added to the site's `<head>` via a custom `_document.tsx`

**Required conversion actions:**
- At least 1 meaningful conversion (e.g., "Guide Read" — triggered when a user scrolls 75% of a guide page)
- Consider: "Discord Join Click", "211 Call Click", "Donate Click" as additional conversions

**Ad Grants requirements:**
- Maintain 5% CTR across campaigns
- Max $2 CPC (auto-bidding strategies like Maximize Conversions are exempt from this cap)
- At least 2 ad groups per campaign, 2 ads per ad group
- Account must be actively managed (log in monthly minimum)
- No single-word keywords, no overly generic keywords
- Geo-targeting recommended (Nevada County / California / nationwide as appropriate)

**Cookie consent:** GA4 uses cookies. Add a minimal cookie consent banner (a small bottom bar, not a modal) that allows visitors to opt out. Link to a privacy policy page (add `/privacy` to site structure, can be a simple static page).

## 17. Monitoring

- **Cloudflare Web Analytics** — always-on, privacy-friendly, no cookie needed
- **Uptime monitoring** — Cloudflare Health Check on homepage + one guide page (free). Alerts via email if the site is unreachable.
- **Build monitoring** — GitHub Actions sends email notifications on failed cron builds

## 18. Future Phases (Not In Scope)

- **Phase 2:** Custom searchable/filterable Resources page (replace Notion DB link)
- **Phase 2:** Client-side search index (Fuse.js or Pagefind) across all content
- **Phase 2:** Video game integration (techempower.org video game — from personal todos)
- **Phase 3:** Blog/news section
- **Phase 3:** Volunteer/intake forms
- **Phase 3:** Multi-language support beyond Spanish summaries

## 19. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Unofficial Notion API changes | Low | High | Fallback to Super.so ($150/yr) within a week. API has been stable for years. Pre-stage a Super.so account as warm standby if desired. |
| Notion image URL expiration | Certain | Medium | Image proxy API route (standard pattern in react-notion-x ecosystem) |
| Alias/synced blocks don't render | Medium | Low | Only affects 7 blocks in EV guide. Can render as linked references instead. |
| Typeform embed on homepage | N/A | None | Homepage is custom React — embed Typeform directly via their React SDK |
| Google Ad Grants 5% CTR requirement | Medium | High | Quality content already exists. Monitor and optimize ad campaigns monthly. |
