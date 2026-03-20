# Contributing to TechEmpower

Thanks for your interest in contributing to [techempower.org](https://techempower.org)!

## Development Setup

Requires **Node.js >= 20** and **pnpm**.

```bash
git clone https://github.com/YOUR_ORG/techempower
cd techempower
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site locally.

## Project Structure

```
components/           React components with CSS Modules
components/homepage/  Custom homepage sections (Hero, GuideGrid, etc.)
lib/                  Config, utilities, hooks, types
pages/                Next.js pages (SSR via Notion API)
styles/               Global CSS and Notion overrides
site.config.ts        Notion page IDs, URL mappings, site metadata
```

## Styling

- **Design tokens** are CSS custom properties in `styles/global.css` (`--te-bark-*`, `--te-teal-*`, `--te-amber-*`, etc.)
- **Notion overrides** go in `styles/notion.css` (targets react-notion-x classes)
- **Component styles** use CSS Modules (e.g., `Header.module.css`)
- **Dark mode**: tokens re-map under `.dark-mode` in `global.css`. In CSS Modules, use `:global(.dark-mode) .yourClass` to target dark mode

## Content

All page content is managed in Notion. To add or modify guides, resources, or pages:

1. Edit content directly in the TechEmpower Notion workspace
2. Map new pages to URL paths in `site.config.ts` under `pageUrlOverrides`
3. Add navigation entries in `site.config.ts` under `navigationLinks` if needed

## Building for Production

```bash
pnpm build
```

## Deploying

The site auto-deploys to Vercel on push to `master`. For manual deploys:

```bash
npx vercel --prod --yes
```

## Debugging Tips

- Run `rm -rf .next` if you see stale content during development
- Check the browser console for `pageId`, `recordMap`, and `block` globals (added in dev mode)
- Notion API fetches can be slow (~5-10s for large databases); the NProgress bar is tuned for this
