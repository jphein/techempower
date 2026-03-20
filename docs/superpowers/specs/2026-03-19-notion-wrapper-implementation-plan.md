# TechEmpower.org Notion Wrapper — Implementation Plan

> Step-by-step implementation plan derived from the [design spec](./2026-03-19-notion-wrapper-design.md).

**Date:** 2026-03-19
**Status:** Draft

---

## Phase 1: Project Setup

**Goal:** Scaffold the project from nextjs-notion-starter-kit, install dependencies, configure environment, and confirm the dev server renders a Notion page.

### Step 1.1 — Clone and Initialize from Starter Kit

**What to do:**
1. Clone `transitive-bullshit/nextjs-notion-starter-kit` into `/home/jp/Projects/techempower/` (merge into the existing directory, or clone to a temp location and move files over, preserving the existing `docs/` directory).
2. Initialize a fresh git repo (`git init`) if not already done.
3. Run `npm install` to install all dependencies.
4. Verify the starter kit's default page renders by running `npm run dev`.

**Files created:**
- All files from the starter kit (package.json, tsconfig.json, next.config.js, pages/, components/, styles/, lib/, etc.)
- `.gitignore` (from starter kit, extend if needed)

**Dependencies:** None (first step).

**Verification:**
- `npm run dev` starts without errors.
- Visiting `http://localhost:3000` renders the starter kit's default Notion page.

### Step 1.2 — Configure Notion Page IDs and Site Metadata

**What to do:**
1. Open `site.config.ts` (the starter kit's central config file).
2. Set `rootNotionPageId` to `0959e445-9998-4143-acab-c80187305001` (TechEmpower's homepage page ID).
3. Set `name` to `TechEmpower`.
4. Set `domain` to `techempower.org`.
5. Set `author` to `TechEmpower`.
6. Set `description` to `Technology for All: Access Made Easy. Free technology resources for individuals with low income, their families, and nonprofit organizations.`
7. Set `defaultPageIcon` and `defaultPageCover` as appropriate (or null).
8. Set `isSearchEnabled` to `true`.
9. Set `isTweetEmbedSupportEnabled` to `false` (not needed).
10. Set `isRedisEnabled` to `false` (no Redis on Cloudflare Pages free tier).
11. Add the Notion page ID mapping as a custom export or constant:

```
navigationLinks: [
  { title: 'About', pageId: 'dbf0ddec-e2ce-468f-b2bf-9049e6322e8a' },
  { title: 'Donate', pageId: '59d8a4da-b0cc-484f-8b04-4d33f240ce1d' },
  { title: 'Resources', url: '<published Notion DB URL>' },
]
```

**Files modified:**
- `site.config.ts`

**Dependencies:** Step 1.1

**Verification:**
- `npm run dev` loads and renders the TechEmpower homepage content from Notion (even if it looks rough — content is pulled correctly).

### Step 1.3 — Create the Slug-to-Page-ID Routing Map

**What to do:**
1. Create a file `lib/page-ids.ts` containing the full mapping from URL slugs to Notion page IDs (from spec Section 6).
2. The map should cover:
   - 8 guide pages under `/guides/[slug]`
   - 3 about pages (`/about`, `/donate`, `/non-discrimination-policy`)
3. Export typed constants so other files can import them.

```typescript
export const GUIDE_PAGE_IDS: Record<string, string> = {
  'how-to-use-techempower': '6c979ba4-e43f-48d7-a483-6e0027ea4178',
  'free-internet': 'bb5e537b-083a-417e-b90e-d9e984128c71',
  'ev-incentives': '758054e1-a2ec-4c1a-a077-202ffedec710',
  'ebt-balance': '272a4ee6-9520-804f-a68a-d8c110af49f6',
  'ebt-spending': '16f7018a-d935-4265-a2b2-16c44464b1c3',
  'findhelp': '992742a6-1e2e-472b-9b4a-149f7aa74539',
  'password-manager': '99b0ab9c-7cce-428e-8c86-e3143752aa1c',
  'free-cell-service': '7519ef16-d7b7-4519-acd9-b8262a7beb84',
}

export const ABOUT_PAGE_IDS: Record<string, string> = {
  'about': 'dbf0ddec-e2ce-468f-b2bf-9049e6322e8a',
  'donate': '59d8a4da-b0cc-484f-8b04-4d33f240ce1d',
  'non-discrimination-policy': 'cdbe9906-ae24-41a1-a9bb-3aec601a5a6c',
}
```

**Files created:**
- `lib/page-ids.ts`

**Dependencies:** Step 1.1

**Verification:**
- File compiles without TypeScript errors.
- Constants are importable from other files.

### Step 1.4 — Configure Next.js Custom Routing

**What to do:**
1. Override the starter kit's default catch-all routing to support the custom URL structure:
   - `/` — Custom homepage (Phase 3; for now, a placeholder)
   - `/guides/[slug]` — Dynamic route for guide pages
   - `/about` — Static route for founder page
   - `/donate` — Static route for donation page
   - `/non-discrimination-policy` — Static route for legal page
   - `/resources` — Redirect to published Notion DB URL
2. Create `pages/guides/[slug].tsx` — Uses `getStaticPaths` (from the guide page ID map) and `getStaticProps` (fetches recordMap via `notion-client`) with ISR revalidation of 60 seconds.
3. Create `pages/about.tsx`, `pages/donate.tsx`, `pages/non-discrimination-policy.tsx` — Each fetches its specific Notion page via `getStaticProps` with ISR revalidation of 60 seconds.
4. Create `pages/resources.tsx` — Returns a redirect to the published Notion Resources database URL.
5. Modify `pages/index.tsx` to render a placeholder homepage (simple text for now — the full custom homepage is Phase 3).

**Files created/modified:**
- `pages/guides/[slug].tsx` (new)
- `pages/about.tsx` (new)
- `pages/donate.tsx` (new)
- `pages/non-discrimination-policy.tsx` (new)
- `pages/resources.tsx` (new)
- `pages/index.tsx` (modified — placeholder homepage)
- Possibly `pages/[...slug].tsx` or `pages/[[...pageId]].tsx` (modified/removed — the starter kit's catch-all route needs to be adjusted so it doesn't conflict)

**Dependencies:** Steps 1.1, 1.2, 1.3

**Verification:**
- `npm run dev` starts without errors.
- Navigating to `/guides/free-internet` renders the Free Internet guide from Notion.
- Navigating to `/about` renders the About the Founder page.
- Navigating to `/donate` renders the donation page.
- Navigating to `/resources` redirects to the Notion DB URL.
- Navigating to `/` shows the placeholder homepage.

### Step 1.5 — Set Up Environment Variables

**What to do:**
1. Create `.env.local` with any required secrets (e.g., if using the official Notion API for any auxiliary data, an API key would go here; for the unofficial API via `notion-client`, no key is needed since all pages are published).
2. Create `.env.example` documenting expected variables.
3. Add `.env.local` to `.gitignore` (likely already there from the starter kit).
4. Verify that the `notion-client` initialization in the starter kit's `lib/notion.ts` works without an API token (public page access).

**Files created/modified:**
- `.env.local` (new, gitignored)
- `.env.example` (new)
- `.gitignore` (verify `.env.local` is listed)

**Dependencies:** Step 1.1

**Verification:**
- `notion-client` fetches page data without authentication errors.
- No secrets are committed to git.

---

## Phase 2: Core Content Rendering

**Goal:** All 8 guide pages and 3 about pages render correctly with proper Notion block support, including tables, callouts, TOC, synced blocks, and inline database views.

### Step 2.1 — Verify All Notion Block Types Render

**What to do:**
1. Visit each of the 8 guide pages in the dev server and audit rendering of every block type listed in the spec:
   - Callouts (blue, yellow, gray, green, purple backgrounds with icons)
   - Tables (fit-page-width, header rows)
   - Table of contents (anchor-linked headings)
   - Checkboxes / to-do lists
   - Numbered and bulleted lists
   - Blockquotes
   - Horizontal rules
   - Inline database views (EV guide)
   - Alias/synced blocks (EV guide, 7 instances)
   - Headings (H2, H3)
   - Links (inline and standalone)
2. Document any blocks that fail to render.
3. For any failing blocks, check if react-notion-x has custom component overrides or if a newer version fixes the issue.

**Pages to test (prioritized by complexity):**
- `free-internet` (7 tables — most complex)
- `free-cell-service` (3 tables, TOC)
- `ev-incentives` (inline DB view, 7 synced blocks)
- `ebt-spending` (2 tables)
- `password-manager` (2 tables)
- `how-to-use-techempower` (short — baseline test)
- `ebt-balance` (short)
- `findhelp` (short)

**Files modified:** Potentially none (this is an audit step); if fixes needed, likely in component overrides.

**Dependencies:** Step 1.4

**Verification:**
- All block types render visually correct in the browser.
- Tables are readable and fit the page width.
- TOC links scroll to correct headings.
- Callouts display colored backgrounds and icons.
- Synced blocks in the EV guide render inline content (not broken references).

### Step 2.2 — Image Proxy for Notion S3 URLs

**What to do:**
1. The starter kit likely already includes an image proxy mechanism. Verify it works by checking if images load on guide pages after the 1-hour Notion URL expiration window.
2. If no image proxy exists, create `pages/api/notion-image.ts` (or use `next/image` with a custom loader):
   - Accepts a Notion image URL as a query parameter.
   - Fetches the image from Notion's S3 (which auto-redirects to a fresh signed URL).
   - Streams the response back with appropriate cache headers (e.g., `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`).
3. Configure `next.config.js` to allow Notion image domains in the `images.domains` array:
   - `www.notion.so`
   - `notion.so`
   - `images.unsplash.com`
   - `s3.us-west-2.amazonaws.com`
   - `prod-files-secure.s3.us-west-2.amazonaws.com`

**Files created/modified:**
- `pages/api/notion-image.ts` (new, if not already present)
- `next.config.js` (modified — image domains)

**Dependencies:** Step 1.4

**Verification:**
- Images on guide pages render correctly.
- After waiting >1 hour (or by manually expiring an S3 URL), images still load via the proxy.
- No broken image icons on any page.

### Step 2.3 — Spanish Language Toggle on Guide Pages

**What to do:**
1. Analyze the Notion content for each guide to understand how the Spanish section is structured. Per the spec, it is in an "Espanol callout" currently at the bottom of each guide.
2. Create a `SpanishToggle` React component:
   - Renders a toggle/button at the top of the guide page: "English | Espanol"
   - Default state: English (Spanish section hidden).
   - When toggled to Espanol: scroll to and reveal the Spanish callout section, or ideally surface it prominently at the top of the guide.
3. Implementation approach:
   - Use react-notion-x's `mapPageUrl` or custom block renderer to identify the Spanish callout block by its characteristics (likely a callout with a specific icon or text pattern like "Espanol" or Spanish flag emoji).
   - Use CSS to hide/show the Spanish section based on a state variable.
   - Store the language preference in `localStorage` so it persists across page loads.
4. Integrate the `SpanishToggle` into the guide page layout component.

**Files created:**
- `components/SpanishToggle.tsx` (new)
- `components/SpanishToggle.module.css` (new)

**Files modified:**
- `pages/guides/[slug].tsx` — Add the SpanishToggle component above the NotionRenderer.

**Dependencies:** Steps 1.4, 2.1

**Verification:**
- Each guide page shows an "English | Espanol" toggle at the top.
- Clicking "Espanol" reveals the Spanish content section.
- Clicking "English" hides it and returns to the default view.
- Language preference persists on page reload (localStorage).
- The toggle is keyboard-accessible and has proper ARIA attributes.

### Step 2.4 — Breadcrumb Navigation on Guide Pages

**What to do:**
1. Create a `Breadcrumb` component that renders: `Home > Guides > [Guide Title]`
2. Each breadcrumb segment is a link (Home links to `/`, Guides could link to a future guides index or `/`, Guide Title is plain text for the current page).
3. Use semantic HTML: `<nav aria-label="Breadcrumb">` with an `<ol>` list.
4. Add structured data (JSON-LD BreadcrumbList schema) for SEO.
5. Integrate into the guide page layout, positioned above the page title.

**Files created:**
- `components/Breadcrumb.tsx` (new)
- `components/Breadcrumb.module.css` (new)

**Files modified:**
- `pages/guides/[slug].tsx` — Add the Breadcrumb component.

**Dependencies:** Step 1.4

**Verification:**
- Breadcrumbs appear above the guide title on every guide page.
- "Home" links to `/`.
- Current page title is displayed as non-linked text.
- Screen readers can navigate the breadcrumb via the `<nav>` landmark.
- JSON-LD BreadcrumbList schema is present in the page source.

### Step 2.5 — Related Guides Section on Guide Pages

**What to do:**
1. Analyze each guide's Notion content to find the "related guides" section (currently plain text links at the bottom of each guide).
2. Create a `RelatedGuides` component:
   - Renders related guides as styled card links (not plain text).
   - Each card shows the guide title and a brief description.
   - Cards link to the corresponding `/guides/[slug]` route.
3. Approach options:
   - **Option A (preferred):** Parse the related guides from the Notion recordMap data by identifying the "Related" section programmatically and replacing plain links with cards.
   - **Option B:** Maintain a static mapping of related guides per page in config and render cards below the NotionRenderer output.
4. Style the cards to match the brand (Phase 4 will refine styling).

**Files created:**
- `components/RelatedGuides.tsx` (new)
- `components/RelatedGuides.module.css` (new)

**Files modified:**
- `pages/guides/[slug].tsx` — Add the RelatedGuides component below the main content.

**Dependencies:** Steps 1.3, 1.4, 2.1

**Verification:**
- Each guide page displays related guides as clickable cards at the bottom.
- Clicking a card navigates to the correct guide page.
- Cards are visually distinct from the main Notion-rendered content.

---

## Phase 3: Custom Homepage Design & Build

**Goal:** Build the fully custom React homepage (not Notion-rendered) with all sections defined in the spec.

### Step 3.1 — Homepage Hero Section

**What to do:**
1. Replace the placeholder in `pages/index.tsx` with the custom homepage layout.
2. Build the Hero component:
   - Tagline: "Technology for All: Access Made Easy"
   - Brief mission statement (1-2 sentences, 6th-grade reading level).
   - Primary CTA button (e.g., "Explore Free Resources" linking to the guide grid below, or "Get Started" linking to the "How to use TechEmpower" guide).
3. Use semantic HTML: `<section>` with appropriate heading hierarchy (`<h1>` for the tagline).
4. Mobile-first responsive design.

**Files created:**
- `components/homepage/Hero.tsx` (new)
- `components/homepage/Hero.module.css` (new)

**Files modified:**
- `pages/index.tsx`

**Dependencies:** Phase 1 complete

**Verification:**
- Homepage displays the hero with tagline, mission, and CTA.
- CTA button is clickable and navigates correctly.
- Looks correct on mobile (320px), tablet (768px), and desktop (1200px+).

### Step 3.2 — Featured Guides Card Grid

**What to do:**
1. Build a `GuideGrid` component rendering all 8 guides as cards.
2. Each card includes:
   - An icon (matching or inspired by the guide's Notion icon).
   - The guide title.
   - A one-line summary (written at 6th-grade reading level).
   - Clickable — links to `/guides/[slug]`.
3. Use CSS Grid or Flexbox for responsive layout:
   - 1 column on mobile.
   - 2 columns on tablet.
   - 3-4 columns on desktop.
4. Guide metadata (titles, summaries, icons, slugs) should be defined in a config file or derived from `lib/page-ids.ts`.

**Files created:**
- `components/homepage/GuideGrid.tsx` (new)
- `components/homepage/GuideGrid.module.css` (new)
- `lib/guide-metadata.ts` (new — titles, summaries, icons for each guide)

**Files modified:**
- `pages/index.tsx`

**Dependencies:** Step 3.1, Step 1.3

**Verification:**
- All 8 guides appear as cards on the homepage.
- Each card links to the correct guide page.
- Grid is responsive across breakpoints.
- Cards have clear visual hierarchy (icon, title, summary).

### Step 3.3 — Support Channels Section

**What to do:**
1. Build a `SupportChannels` component with two callouts:
   - **Discord chat support** — Link to the TechEmpower Discord server with a brief description of live help available.
   - **211 phone support** — Explain that dialing 211 connects to local community resources, include a brief description.
2. Use card or callout styling to make these visually prominent.
3. Include appropriate icons (chat bubble for Discord, phone for 211).

**Files created:**
- `components/homepage/SupportChannels.tsx` (new)
- `components/homepage/SupportChannels.module.css` (new)

**Files modified:**
- `pages/index.tsx`

**Dependencies:** Step 3.1

**Verification:**
- Support section renders two visually distinct callouts.
- Discord link opens correctly (in new tab).
- 211 info is clear and readable.

### Step 3.4 — About/Donate Section

**What to do:**
1. Build an `AboutDonate` component:
   - Brief "About TechEmpower" paragraph (2-3 sentences, 6th-grade reading level).
   - "Learn More" link to `/about`.
   - "Donate" CTA button linking to the PayPal Giving Fund page (or `/donate` page).
2. The donate CTA should be visually prominent (accent-colored button).

**Files created:**
- `components/homepage/AboutDonate.tsx` (new)
- `components/homepage/AboutDonate.module.css` (new)

**Files modified:**
- `pages/index.tsx`

**Dependencies:** Step 3.1

**Verification:**
- About section renders with text, "Learn More" link, and "Donate" button.
- Links navigate correctly.
- Donate button stands out visually.

### Step 3.5 — Footer

**What to do:**
1. Build a `Footer` component (shared across all pages, not just the homepage):
   - Contact email: jp@techempower.org (as a `mailto:` link)
   - Non-discrimination policy link (`/non-discrimination-policy`)
   - Copyright: "© 2026 TechEmpower. All rights reserved." (or similar)
2. Keep the footer simple and accessible.
3. Use semantic HTML: `<footer>` element.

**Files created:**
- `components/Footer.tsx` (new)
- `components/Footer.module.css` (new)

**Files modified:**
- `pages/index.tsx` (or the shared layout component — see Phase 4)

**Dependencies:** Step 1.1

**Verification:**
- Footer appears at the bottom of the homepage.
- Email link opens the mail client.
- Non-discrimination policy link navigates correctly.
- Footer is readable with sufficient contrast.

---

## Phase 4: Navigation, Layout, Branding

**Goal:** Establish consistent navigation, shared layout, and brand styling across all pages.

### Step 4.1 — Shared Layout Component

**What to do:**
1. Create (or modify the starter kit's existing) `Layout` component that wraps all pages:
   - Header with navigation.
   - Main content area.
   - Footer (from Step 3.5).
2. Apply the layout in `pages/_app.tsx` or as a wrapper in each page.
3. Include a skip-to-content link (`<a href="#main-content" class="skip-link">Skip to main content</a>`) as the first focusable element in the layout.

**Files created/modified:**
- `components/Layout.tsx` (new or modified from starter kit)
- `components/Layout.module.css` (new or modified)
- `pages/_app.tsx` (modified)

**Dependencies:** Step 3.5

**Verification:**
- Every page has consistent header and footer.
- Skip-to-content link is visible on keyboard focus and jumps to `#main-content`.
- Layout works correctly on mobile, tablet, and desktop.

### Step 4.2 — Header and Navigation

**What to do:**
1. Build the `Header` component:
   - TechEmpower logo/wordmark (top left).
   - Navigation links: Home, Guides (dropdown or link), About, Donate, Resources.
   - Mobile: hamburger menu that opens a slide-out or dropdown nav.
   - Desktop: horizontal nav bar.
2. Highlight the current page in the nav (active state).
3. Ensure keyboard navigability (Tab through links, Enter to activate, Escape to close mobile menu).
4. Use semantic HTML: `<header>`, `<nav>`, `<ul>`, `<li>`, `<a>`.

**Files created:**
- `components/Header.tsx` (new or modified from starter kit)
- `components/Header.module.css` (new or modified)

**Files modified:**
- `components/Layout.tsx` — Include the Header.

**Dependencies:** Step 4.1

**Verification:**
- Navigation appears on all pages.
- All links navigate to correct routes.
- Mobile hamburger menu opens/closes correctly.
- Active page is visually indicated.
- Keyboard-navigable (Tab, Enter, Escape).
- Screen readers can identify the nav via `<nav>` landmark.

### Step 4.3 — Brand Styling and CSS Overrides

**What to do:**
1. Define the brand color palette, typography, and spacing as CSS custom properties in a global stylesheet:
   - Primary color, secondary color, accent color (for CTAs).
   - Font family (choose a web-safe or Google Font appropriate for low-literacy audience — high readability, clear letterforms).
   - Font sizes, line heights, spacing scale.
   - Dark mode variables (the starter kit supports dark mode toggle — decide whether to keep it or force light mode only for simplicity).
2. Override react-notion-x's default styles to match the brand:
   - Target `.notion-*` class names with custom CSS.
   - Adjust callout background colors, table styles, heading sizes, link colors.
   - Ensure tables are horizontally scrollable on mobile.
3. Style the guide pages to feel cohesive with the custom homepage.

**Files created/modified:**
- `styles/globals.css` or `styles/custom.css` (new or modified)
- `styles/notion-overrides.css` (new — CSS overrides for react-notion-x)

**Dependencies:** Steps 2.1, 3.1, 4.1

**Verification:**
- All pages use consistent colors, fonts, and spacing.
- Guide pages (Notion-rendered) look cohesive with the custom homepage.
- Tables on guide pages scroll horizontally on narrow screens instead of overflowing.
- Callouts have readable contrast ratios.
- Dark mode (if retained) properly inverts all custom styles.

### Step 4.4 — Logo and Favicon

**What to do:**
1. Obtain or create the TechEmpower logo (may already exist in the Notion workspace or Canva — the org has Canva Pro for nonprofits).
2. Generate favicon files from the logo:
   - `favicon.ico` (16x16, 32x32)
   - `apple-touch-icon.png` (180x180)
   - `favicon-32x32.png`, `favicon-16x16.png`
   - `site.webmanifest` with icon references
3. Place these in the `public/` directory.
4. Reference in `pages/_document.tsx` or `pages/_app.tsx` via `<Head>`.

**Files created:**
- `public/favicon.ico`
- `public/apple-touch-icon.png`
- `public/favicon-32x32.png`
- `public/favicon-16x16.png`
- `public/site.webmanifest`

**Files modified:**
- `pages/_document.tsx` or `pages/_app.tsx` — `<link>` tags for favicons.

**Dependencies:** Step 1.1 (needs logo asset from org)

**Verification:**
- Favicon appears in browser tab for all pages.
- Apple touch icon displays correctly when bookmarking on iOS.
- `site.webmanifest` is accessible at `/site.webmanifest`.

---

## Phase 5: SEO & Analytics

**Goal:** Implement sitemap, meta tags, structured data, Google Analytics, and prepare for Google Search Console verification.

### Step 5.1 — Sitemap Generation

**What to do:**
1. The starter kit may already include sitemap generation. Verify by checking if `/sitemap.xml` is generated during build.
2. If not, create a `pages/sitemap.xml.tsx` (or use `next-sitemap` package):
   - Include all guide pages: `/guides/how-to-use-techempower`, `/guides/free-internet`, etc.
   - Include about pages: `/about`, `/donate`, `/non-discrimination-policy`.
   - Include the homepage: `/`.
   - Set `lastmod` based on build time or Notion page last-edited time.
   - Set `changefreq` to `weekly` for guides, `monthly` for about pages.
   - Set `priority` to `1.0` for homepage, `0.8` for guides, `0.6` for about pages.
3. If using `next-sitemap`, install it and add a `next-sitemap.config.js`.

**Files created/modified:**
- `pages/sitemap.xml.tsx` or `next-sitemap.config.js` (new)
- `package.json` (if adding `next-sitemap` dependency)

**Dependencies:** Step 1.4 (all routes must exist)

**Verification:**
- `npm run build` generates a sitemap.
- Visiting `/sitemap.xml` returns valid XML listing all pages.
- Validate with an XML sitemap validator.

### Step 5.2 — robots.txt

**What to do:**
1. Create `public/robots.txt`:
   ```
   User-agent: *
   Allow: /
   Sitemap: https://techempower.org/sitemap.xml
   ```
2. Ensure it does not block any public pages.

**Files created:**
- `public/robots.txt`

**Dependencies:** Step 5.1

**Verification:**
- `/robots.txt` is accessible and has correct content.
- No pages are inadvertently blocked.

### Step 5.3 — Meta Tags (Title, Description, Open Graph)

**What to do:**
1. Implement a `PageHead` component (or use Next.js `<Head>`) that sets per-page meta tags:
   - `<title>` — "[Page Title] | TechEmpower" (or just "TechEmpower — Technology for All" for homepage).
   - `<meta name="description">` — Page-specific description pulled from Notion page properties (the "Auto Summary" property mentioned in spec) or hardcoded for static pages.
   - Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`.
   - Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
2. For guide pages, pull the title from the Notion recordMap data.
3. For the homepage, hardcode the meta tags.
4. For about pages, set appropriate titles and descriptions.
5. Set a default `og:image` (social sharing image) — can be auto-generated by the starter kit's social image feature or a static branded image.

**Files created/modified:**
- `components/PageHead.tsx` (new — or integrated into existing head management)
- Each page file (`pages/index.tsx`, `pages/guides/[slug].tsx`, `pages/about.tsx`, etc.) to pass meta props.

**Dependencies:** Steps 1.4, 4.4

**Verification:**
- View page source on each page and confirm correct `<title>`, `<meta name="description">`, and OG tags.
- Use the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or [Twitter Card Validator](https://cards-dev.twitter.com/validator) to preview social sharing appearance (once deployed).
- No duplicate or missing meta tags.

### Step 5.4 — Structured Data (Schema.org)

**What to do:**
1. Add JSON-LD structured data to the homepage:
   - `@type: NonprofitOrganization` (or `NGO` — check Schema.org for the appropriate type).
   - Include: `name`, `url`, `description`, `logo`, `contactPoint` (email), `sameAs` (social links if any).
2. Add JSON-LD BreadcrumbList to guide pages (done in Step 2.4, verify it works).
3. Add JSON-LD `WebSite` schema with `SearchAction` if search is enabled.
4. Inject structured data via `<script type="application/ld+json">` in the `<Head>`.

**Files created/modified:**
- `components/StructuredData.tsx` (new)
- `pages/index.tsx` — Include structured data component.
- `pages/guides/[slug].tsx` — Include breadcrumb structured data.

**Dependencies:** Steps 2.4, 5.3

**Verification:**
- Use [Google Rich Results Test](https://search.google.com/test/rich-results) to validate structured data.
- Confirm the NonprofitOrganization schema appears on the homepage.
- Confirm BreadcrumbList schema appears on guide pages.

### Step 5.5 — Google Analytics (GA4)

**What to do:**
1. Create a Google Analytics 4 property for techempower.org (in the TechEmpower Google account).
2. Obtain the Measurement ID (G-XXXXXXXXXX).
3. Add the GA4 script to `pages/_document.tsx` or `pages/_app.tsx`:
   - Use `<Script>` from `next/script` with `strategy="afterInteractive"`.
   - Include the `gtag.js` snippet with the Measurement ID.
4. Set the GA4 Measurement ID as an environment variable (`NEXT_PUBLIC_GA_ID`) so it can differ between dev and prod.
5. Verify events are tracked: page views, outbound link clicks (for PayPal donation link, Discord link, etc.).

**Files created/modified:**
- `components/GoogleAnalytics.tsx` (new)
- `pages/_app.tsx` or `pages/_document.tsx` (modified)
- `.env.local` (add `NEXT_PUBLIC_GA_ID`)
- `.env.example` (add `NEXT_PUBLIC_GA_ID` placeholder)

**Dependencies:** Step 1.5

**Verification:**
- In dev: check browser Network tab for requests to `google-analytics.com`.
- In GA4 dashboard: confirm real-time events show page views.
- Ensure the script loads with `afterInteractive` strategy (doesn't block initial paint).

### Step 5.6 — Google Search Console Preparation

**What to do:**
1. Document the DNS TXT record needed for Google Search Console verification.
2. After deployment (Phase 7), add the verification TXT record to Cloudflare DNS.
3. Submit the sitemap URL (`https://techempower.org/sitemap.xml`) in Search Console.
4. This step is mostly documentation and post-deployment action — no code changes.

**Files created:**
- None (documentation step; add notes to the project README or a deploy checklist).

**Dependencies:** Phases 5.1, 7

**Verification:**
- Google Search Console shows the site as verified.
- Sitemap is submitted and pages are being indexed.

---

## Phase 6: Accessibility & Performance

**Goal:** Meet WCAG 2.1 Level AA accessibility target and achieve Lighthouse 90+ across all categories.

### Step 6.1 — Accessibility Audit and Fixes

**What to do:**
1. Run automated accessibility checks:
   - Use Lighthouse (in Chrome DevTools) on the homepage, one short guide page, and one long guide page.
   - Use `axe-core` browser extension for detailed violation reports.
   - Use WAVE (web accessibility evaluation tool) for visual overlay of issues.
2. Fix common issues:
   - **Color contrast:** Ensure all text meets 4.5:1 contrast ratio (use the brand colors from Step 4.3 — test against both light and dark backgrounds).
   - **Heading hierarchy:** Verify `<h1>` is used once per page, followed by `<h2>`, `<h3>` in order. react-notion-x may render Notion's heading structure — verify it produces valid hierarchy.
   - **Alt text:** Check all images. For Notion images, alt text may come from the caption or be empty. Add meaningful alt text where possible (may require a custom image renderer override in react-notion-x).
   - **Focus indicators:** Ensure all interactive elements (links, buttons, toggles) have visible focus outlines. Do not remove outlines with `outline: none` without providing a replacement.
   - **Skip-to-content link:** Verify it works (from Step 4.1).
   - **ARIA attributes:** Add `aria-label` to navigation landmarks, `aria-expanded` to the mobile menu toggle, `aria-current="page"` to the active nav link.
   - **Form controls:** If any (e.g., the Spanish toggle, dark mode toggle), ensure they have accessible labels.
3. Test keyboard navigation:
   - Tab through every interactive element on each page.
   - Verify focus order is logical (top to bottom, left to right).
   - Verify the mobile menu can be opened, navigated, and closed via keyboard.
4. Test with a screen reader (VoiceOver on macOS or NVDA on Windows):
   - Homepage reads logically.
   - Guide pages read the content in order.
   - Navigation landmarks are announced.

**Files modified:** Various component files as needed for fixes.

**Dependencies:** Phases 2, 3, 4

**Verification:**
- Lighthouse Accessibility score >= 90 on all pages.
- axe-core reports 0 critical or serious violations.
- All interactive elements are keyboard-accessible.
- Screen reader announces page content logically.

### Step 6.2 — Performance Optimization

**What to do:**
1. Run Lighthouse Performance audit on the homepage and the longest guide page (free-internet).
2. Optimize based on findings:
   - **Largest Contentful Paint (LCP):** Ensure the hero image or text loads quickly. Preload critical assets.
   - **First Input Delay (FID) / Total Blocking Time (TBT):** Minimize JavaScript. react-notion-x should render mostly static HTML — ensure no large JS bundles are loaded unnecessarily.
   - **Cumulative Layout Shift (CLS):** Set explicit width/height on images. Avoid dynamically inserted content above the fold.
   - **Image optimization:** Use Next.js `<Image>` component with `next/image` for all images (including Notion-proxied images). Set appropriate `sizes` and `quality` props.
   - **Font loading:** If using Google Fonts, use `next/font` for optimal loading (font-display: swap, preloading).
   - **Code splitting:** Ensure react-notion-x's heavier components (e.g., code block syntax highlighting, equation rendering) are dynamically imported only on pages that need them.
   - **Bundle analysis:** Run `npm run build` and check the bundle sizes. Use `@next/bundle-analyzer` if needed.
3. Set up caching headers in `next.config.js`:
   - Static assets: `Cache-Control: public, max-age=31536000, immutable`
   - HTML pages: ISR handles this (stale-while-revalidate pattern).
4. Verify Brotli compression will be applied by Cloudflare (automatic, no action needed — just verify after deployment).

**Files modified:** Various configuration and component files.

**Dependencies:** Phases 2, 3, 4

**Verification:**
- Lighthouse Performance score >= 90 on homepage and guide pages.
- LCP < 2.5s, FID < 100ms, CLS < 0.1.
- Total page weight is reasonable (target: < 500KB initial load for homepage).
- No render-blocking resources in the network waterfall.

### Step 6.3 — Mobile Responsiveness Testing

**What to do:**
1. Test all pages at the following breakpoints:
   - 320px (small mobile)
   - 375px (typical mobile)
   - 768px (tablet)
   - 1024px (small desktop)
   - 1440px (large desktop)
2. Verify:
   - No horizontal overflow or content clipping.
   - Tables on guide pages are horizontally scrollable (not overflowing the viewport).
   - Text is readable without zooming (minimum 16px body text).
   - Touch targets are at least 44x44px.
   - The mobile navigation menu works correctly.
   - The guide card grid adapts column count per breakpoint.
3. Fix any layout issues discovered.

**Files modified:** Various CSS files as needed.

**Dependencies:** Phases 2, 3, 4

**Verification:**
- All pages render correctly at every breakpoint.
- No horizontal scrollbar on any page (except within table containers).
- Lighthouse "mobile" mode scores match desktop scores (within ~5 points).

---

## Phase 7: Deployment to Cloudflare Pages

**Goal:** Deploy the Next.js app to Cloudflare Pages and verify it works on a `*.pages.dev` domain before DNS cutover.

### Step 7.1 — Adapt Next.js for Cloudflare Pages Compatibility

**What to do:**
1. Cloudflare Pages supports Next.js via `@cloudflare/next-on-pages`. Install this package.
2. Alternatively, if using static export (`next export`), no adapter is needed — but this sacrifices ISR and API routes. Evaluate the tradeoff:
   - **Option A (preferred): `@cloudflare/next-on-pages`** — Supports ISR, API routes (image proxy), and SSR via Cloudflare Workers. Requires the `nodejs_compat` compatibility flag.
   - **Option B: Static export** — Simpler, but no ISR (content updates require full rebuilds) and no image proxy API route (would need a separate Cloudflare Worker).
3. If using Option A:
   - Install `@cloudflare/next-on-pages`.
   - Add a `wrangler.toml` configuration file.
   - Set the compatibility flags: `nodejs_compat`.
   - Update `next.config.js` if needed for Edge Runtime compatibility.
   - Ensure the image proxy API route works in the Workers environment.
4. If any Next.js features are incompatible with Cloudflare Pages (e.g., certain Node.js APIs in the image proxy), adapt them to use the Edge Runtime or Cloudflare Workers APIs.

**Files created/modified:**
- `wrangler.toml` (new)
- `next.config.js` (modified if needed)
- `package.json` (add `@cloudflare/next-on-pages`, build scripts)

**Dependencies:** Phases 1-6

**Verification:**
- `npx @cloudflare/next-on-pages` builds successfully.
- Local preview with `wrangler pages dev` serves the site correctly.

### Step 7.2 — Create Cloudflare Pages Project

**What to do:**
1. Log into the Cloudflare dashboard (the account that already manages techempower.org DNS).
2. Go to Workers & Pages > Create application > Pages.
3. Connect to the GitHub repository (push the project to GitHub first if not already there):
   - Create a GitHub repo (e.g., `techempower/techempower.org` or JP's personal GitHub under a TechEmpower org).
   - Push all code.
   - Connect Cloudflare Pages to the repo.
4. Configure build settings:
   - Build command: `npx @cloudflare/next-on-pages` (or `npm run build && npx next-export` if using static export).
   - Build output directory: `.vercel/output/static` (for `@cloudflare/next-on-pages`) or `out` (for static export).
   - Root directory: `/` (or the subdirectory if the repo has a monorepo structure).
5. Set environment variables in the Cloudflare Pages dashboard:
   - `NEXT_PUBLIC_GA_ID` — Google Analytics Measurement ID.
   - Any other env vars from `.env.example`.
   - `NODE_VERSION` — Set to a compatible version (e.g., `18`).
6. Trigger the first deployment.

**Files modified:**
- None (this is a Cloudflare dashboard configuration step).

**Dependencies:** Step 7.1, project pushed to GitHub

**Verification:**
- Cloudflare Pages build succeeds.
- The site is live at `<project-name>.pages.dev`.
- All pages render correctly on the `*.pages.dev` URL.
- ISR works: edit a Notion page, wait 60 seconds, refresh the deployed page — changes appear.
- Image proxy works: images load correctly on deployed guide pages.

### Step 7.3 — Test the Deployed Site

**What to do:**
1. Systematically test every page on the `*.pages.dev` URL:
   - Homepage: all sections render, links work, responsive.
   - All 8 guide pages: content renders, tables work, callouts display, Spanish toggle works, breadcrumbs work, related guides work.
   - About page: content renders.
   - Donate page: content renders, PayPal link works.
   - Non-discrimination policy page: content renders.
   - Resources: redirects to Notion DB.
2. Test functionality:
   - Image proxy: images load and don't break after 1+ hours.
   - Sitemap: `/sitemap.xml` returns valid XML.
   - robots.txt: `/robots.txt` returns correct content.
   - Social sharing: paste a URL into Twitter/Facebook/LinkedIn and verify the preview looks correct.
3. Run Lighthouse on the deployed URL (both mobile and desktop).
4. Run axe-core on the deployed URL.
5. Test on real mobile devices if possible (or BrowserStack).

**Files modified:** Bug fixes as discovered.

**Dependencies:** Step 7.2

**Verification:**
- All pages load without errors on `*.pages.dev`.
- Lighthouse scores >= 90 across all categories.
- No accessibility violations (axe-core).
- Social sharing previews work.
- Image proxy serves images correctly.

---

## Phase 8: DNS Cutover & Go-Live

**Goal:** Point techempower.org to the Cloudflare Pages deployment and verify everything works on the production domain.

### Step 8.1 — Configure Custom Domain in Cloudflare Pages

**What to do:**
1. In the Cloudflare Pages project settings, go to Custom domains.
2. Add `techempower.org` as a custom domain.
3. Add `www.techempower.org` as a custom domain (redirect to apex or serve both).
4. Cloudflare will automatically configure the DNS records since the domain's DNS is already on Cloudflare. If prompted, confirm the CNAME record creation.
5. If Cloudflare does not auto-configure:
   - Remove existing A/AAAA/CNAME records pointing to Squarespace.
   - Add CNAME: `techempower.org` -> `<project>.pages.dev` (Cloudflare handles apex CNAME flattening).
   - Add CNAME: `www` -> `<project>.pages.dev` (or a redirect rule from www to apex).

**Files modified:** None (DNS configuration in Cloudflare dashboard).

**Dependencies:** Step 7.3 (site must be fully tested on `*.pages.dev` first)

**Verification:**
- `https://techempower.org` serves the new site.
- `https://www.techempower.org` redirects to `https://techempower.org` (or serves the same content).
- SSL certificate is active (Cloudflare auto-provisions this).
- No mixed content warnings.

### Step 8.2 — Google Search Console Verification

**What to do:**
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add property for `techempower.org`.
3. Verify via DNS TXT record:
   - Add the verification TXT record to Cloudflare DNS.
   - Wait for propagation (usually < 5 minutes on Cloudflare).
   - Click "Verify" in Search Console.
4. Submit the sitemap: `https://techempower.org/sitemap.xml`.
5. Request indexing for the homepage and key guide pages.

**Files modified:** None (external service configuration).

**Dependencies:** Step 8.1

**Verification:**
- Google Search Console shows the property as verified.
- Sitemap is submitted and shows "Success" status.
- After a few days, pages begin appearing in Google Search results.

### Step 8.3 — Google Ad Grants Activation

**What to do:**
1. Return to the Google Ad Grants application (currently "Under Review" per the workspace findings).
2. Update the application with the live custom domain URL: `https://techempower.org`.
3. Ensure the site meets Ad Grants requirements:
   - Has a custom domain (done).
   - Is a live, functioning website with meaningful content (done).
   - Has Google Analytics installed (done — Step 5.5).
4. Monitor the application status.

**Files modified:** None (external service configuration).

**Dependencies:** Steps 8.1, 5.5

**Verification:**
- Ad Grants application is submitted/updated with the live domain.
- Google approves the Ad Grants account.
- Ad campaigns can be created in the Google Ads dashboard.

### Step 8.4 — Cloudflare Web Analytics

**What to do:**
1. Enable Cloudflare Web Analytics for techempower.org in the Cloudflare dashboard.
2. This is privacy-friendly and requires no cookie banner.
3. Cloudflare auto-injects the analytics beacon for sites on their CDN, but verify this is enabled.
4. This supplements Google Analytics — Cloudflare analytics is cookie-free and provides core web vitals data.

**Files modified:** None (Cloudflare dashboard configuration).

**Dependencies:** Step 8.1

**Verification:**
- Cloudflare Web Analytics dashboard shows traffic data for techempower.org.
- No cookie consent banner is needed (Cloudflare analytics is cookie-free).

### Step 8.5 — Post-Launch Monitoring and Smoke Test

**What to do:**
1. Monitor for 48 hours after go-live:
   - Check Cloudflare analytics for traffic and errors.
   - Check Google Analytics for page views.
   - Verify ISR is working: edit a Notion page, wait 60 seconds, confirm the change appears on the live site.
   - Check for any 404 errors or broken links.
2. Set up Cloudflare health check or a free uptime monitor (e.g., UptimeRobot free tier) for `https://techempower.org`.
3. Test from different devices and networks (mobile data, different ISPs) to confirm CDN is working globally.
4. Document any issues found and create follow-up tasks.

**Files modified:** None (monitoring step).

**Dependencies:** Step 8.1

**Verification:**
- Site is stable with no downtime over 48 hours.
- ISR content updates work on the production domain.
- No 404s or broken functionality reported.
- Analytics are collecting data.

---

## Dependency Graph Summary

```
Phase 1 (Setup)
  ├── 1.1 Clone starter kit
  ├── 1.2 Configure site metadata ──── depends on 1.1
  ├── 1.3 Create page ID map ───────── depends on 1.1
  ├── 1.4 Configure routing ─────────── depends on 1.1, 1.2, 1.3
  └── 1.5 Environment variables ─────── depends on 1.1

Phase 2 (Content Rendering) ──────── depends on Phase 1
  ├── 2.1 Verify block types ────────── depends on 1.4
  ├── 2.2 Image proxy ──────────────── depends on 1.4
  ├── 2.3 Spanish toggle ───────────── depends on 1.4, 2.1
  ├── 2.4 Breadcrumbs ──────────────── depends on 1.4
  └── 2.5 Related guides ──────────── depends on 1.3, 1.4, 2.1

Phase 3 (Homepage) ──────────────── depends on Phase 1
  ├── 3.1 Hero section ─────────────── depends on Phase 1
  ├── 3.2 Guide grid ───────────────── depends on 3.1, 1.3
  ├── 3.3 Support channels ─────────── depends on 3.1
  ├── 3.4 About/Donate section ─────── depends on 3.1
  └── 3.5 Footer ───────────────────── depends on 1.1

Phase 4 (Navigation & Branding) ── depends on Phases 2, 3
  ├── 4.1 Shared layout ────────────── depends on 3.5
  ├── 4.2 Header/navigation ────────── depends on 4.1
  ├── 4.3 Brand styling ───────────── depends on 2.1, 3.1, 4.1
  └── 4.4 Logo/favicon ────────────── depends on 1.1

Phase 5 (SEO & Analytics) ────────── depends on Phases 1, 4
  ├── 5.1 Sitemap ──────────────────── depends on 1.4
  ├── 5.2 robots.txt ───────────────── depends on 5.1
  ├── 5.3 Meta tags ────────────────── depends on 1.4, 4.4
  ├── 5.4 Structured data ─────────── depends on 2.4, 5.3
  ├── 5.5 Google Analytics ─────────── depends on 1.5
  └── 5.6 Search Console prep ─────── depends on 5.1

Phase 6 (Accessibility & Perf) ──── depends on Phases 2, 3, 4
  ├── 6.1 Accessibility audit ──────── depends on Phases 2, 3, 4
  ├── 6.2 Performance optimization ── depends on Phases 2, 3, 4
  └── 6.3 Mobile responsiveness ──── depends on Phases 2, 3, 4

Phase 7 (Deployment) ────────────── depends on Phases 1-6
  ├── 7.1 Cloudflare Pages adapter ── depends on Phases 1-6
  ├── 7.2 Create CF Pages project ─── depends on 7.1
  └── 7.3 Test deployed site ───────── depends on 7.2

Phase 8 (Go-Live) ──────────────── depends on Phase 7
  ├── 8.1 DNS cutover ─────────────── depends on 7.3
  ├── 8.2 Search Console verify ──── depends on 8.1
  ├── 8.3 Ad Grants activation ─────── depends on 8.1, 5.5
  ├── 8.4 Cloudflare Web Analytics ── depends on 8.1
  └── 8.5 Post-launch monitoring ──── depends on 8.1
```

## Parallel Work Opportunities

The following phases/steps can be worked on simultaneously:

- **Phase 2 and Phase 3** can be developed in parallel (content rendering and homepage are independent).
- **Steps 4.4 (logo/favicon)** can happen anytime after 1.1 (just needs the logo asset).
- **Steps 5.1, 5.2, 5.5** can be done as soon as routing exists (Phase 1).
- **Phase 6** should happen last before deployment, as it audits the finished product.

## Estimated Effort

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Project Setup | 2-4 hours | Low |
| Phase 2: Content Rendering | 6-10 hours | Medium-High |
| Phase 3: Custom Homepage | 4-6 hours | Medium |
| Phase 4: Navigation & Branding | 4-6 hours | Medium |
| Phase 5: SEO & Analytics | 3-4 hours | Low-Medium |
| Phase 6: Accessibility & Performance | 4-8 hours | Medium-High |
| Phase 7: Deployment | 2-4 hours | Medium |
| Phase 8: Go-Live | 1-2 hours | Low |
| **Total** | **26-44 hours** | |

Note: Phase 2 (especially Spanish toggle and synced block rendering) and Phase 6 (accessibility audit/fixes) have the most uncertainty and may take longer if issues are discovered.
