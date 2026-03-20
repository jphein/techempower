# TechEmpower — Technology for All: Access Made Easy

> Free technology resources for individuals with low income, their families, and nonprofit organizations.

**[techempower.org](https://techempower.org)**

---

- [About](#about)
- [Tech Stack](#tech-stack)
- [Design System](#design-system)
- [Dark Mode](#dark-mode)
- [Content Architecture](#content-architecture)
- [Development](#development)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

## About

TechEmpower is a registered 501(c)(3) nonprofit based in Grass Valley, California. We promote digital equity, inclusion, and accessibility by curating free technology resources and step-by-step guides.

This repository powers [techempower.org](https://techempower.org) — a Next.js site that renders content from Notion using [react-notion-x](https://github.com/NotionX/react-notion-x).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) (Pages Router, SSR) |
| CMS | [Notion](https://notion.so) via [react-notion-x](https://github.com/NotionX/react-notion-x) |
| Hosting | [Vercel](https://vercel.com) |
| Styling | CSS Modules + global CSS custom properties |
| Fonts | Fraunces (display), DM Sans (body) |
| Analytics | Google Analytics, Fathom (optional), PostHog (optional) |
| Package manager | pnpm |

Built on top of [nextjs-notion-starter-kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit) by Travis Fischer.

## Design System

The site uses a warm earth-tone design system defined as CSS custom properties in [`styles/global.css`](./styles/global.css):

- **Backgrounds:** `--te-cream` (warm off-white), `--te-cream-dark` (slightly darker)
- **Text:** `--te-bark-*` scale (warm dark browns, 100–900)
- **Primary accent:** `--te-teal-*` (trustworthy teal-green)
- **Secondary accent:** `--te-amber-*` (warm amber)
- **Emphasis:** `--te-coral-*` (for urgency)

Notion content styling is overridden in [`styles/notion.css`](./styles/notion.css), targeting react-notion-x's global CSS classes. Component-specific styles use CSS Modules (e.g., `Header.module.css`, `Footer.module.css`).

## Dark Mode

Dark mode supports three tiers:

1. **Inline noflash script** ([`_document.tsx`](./pages/_document.tsx)) — runs before paint, checks `localStorage` then `prefers-color-scheme` to set `dark-mode` or `light-mode` class on `<body>`
2. **React hook** ([`lib/use-dark-mode.ts`](./lib/use-dark-mode.ts)) — syncs React state with body class; manual toggle writes to `localStorage`
3. **System listener** — `matchMedia('prefers-color-scheme: dark')` change listener tracks OS preference when no manual override exists

All `--te-*` tokens are re-mapped under `.dark-mode` in `global.css`, so components using tokens get dark mode automatically. The footer is an exception — it's always dark with hardcoded colors.

## Content Architecture

All content is managed in Notion. The site config ([`site.config.ts`](./site.config.ts)) maps Notion page IDs to URL paths:

| URL | Content |
|-----|---------|
| `/` | Custom homepage (React components, not Notion) |
| `/guides/*` | Step-by-step technology guides (8 guides) |
| `/resources` | Searchable resource database (Notion collection) |
| `/about` | About TechEmpower |
| `/donate` | Donation page |

The homepage ([`pages/index.tsx`](./pages/index.tsx)) is built from custom React components: Hero, GuideGrid, ResourcesPreview, SupportChannels, and AboutDonate.

Guide pages include breadcrumb navigation, Spanish translation toggle, and related guides.

## Development

Requires Node.js >= 20 and pnpm.

```bash
git clone https://github.com/YOUR_ORG/techempower
cd techempower
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Key directories

```
components/       React components (with CSS Modules)
components/homepage/  Homepage section components
lib/              Utilities, config, hooks, types
pages/            Next.js pages (SSR)
styles/           Global CSS (global.css, notion.css, prism-theme.css)
site.config.ts    Notion page IDs, navigation, site metadata
```

### Useful commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build locally |
| `pnpm format` | Format code with Prettier |
| `pnpm deploy` | Deploy to Vercel |

## Deployment

The site deploys to **Vercel**. Push to `master` to trigger automatic deployment.

Manual deploy:
```bash
npx vercel --prod --yes
```

SSR pages include CDN caching headers (`s-maxage=3600, stale-while-revalidate=86400`) for fast subsequent loads.

## Environment Variables

Set these in your Vercel project settings or in a local `.env` file:

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_API_KEY` | No | Notion integration token (for private pages) |
| `NEXT_PUBLIC_FATHOM_ID` | No | Fathom Analytics site ID |
| `NEXT_PUBLIC_POSTHOG_ID` | No | PostHog project API key |
| `REDIS_HOST` | No | Redis host for preview image caching |
| `REDIS_PASSWORD` | No | Redis password |

## Contributing

See [contributing.md](./contributing.md) for development setup and guidelines.

## License

MIT — Built on [nextjs-notion-starter-kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit) by [Travis Fischer](https://transitivebullsh.it).
