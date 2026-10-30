<div align="center">

# astro-homepage

**The RU/EN portfolio & resume Site of Sviataslau Kuntsov.**

A fast, no-flash, Astro-native site that presents three years of backend
experience as a recruiter-ready resume — plus a showcase of projects and art.

[![CI](https://github.com/SlavaKuntsov/astro-homepage/actions/workflows/ci.yml/badge.svg)](https://github.com/SlavaKuntsov/astro-homepage/actions/workflows/ci.yml)
[![Astro](https://img.shields.io/badge/Astro-5-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://slava-homepage.vercel.app/)

[**Live site →**](https://slava-homepage.vercel.app/)

</div>

---

## Why this exists

The Site exists to remove one specific defect: the **Flash** — any brief paint of
the wrong theme or locale during load or navigation. The theme and the Locale are
correct on the very first frame, on reload and across client-side navigation.
Everything else is built around that constraint.

## Features

- **No Flash** — `data-theme` and the Locale are set before first paint, never
  resolved in client JS after hydration.
- **Two Locales, one site** — English by default at `/`, Russian under `/ru/…`,
  with the language switch preserving the current page.
- **Resume as typed content** — experience, education, skills, projects and art
  live in Astro **content collections**; mistyped frontmatter fails the build.
- **Projects showcase** — index + detail pages, screenshots, links, and optional
  build-time GitHub enrichment (stars, topics, language breakdown) for public repos.
- **Print-ready CV** — the home page's resume sections print cleanly, plus a
  downloadable static `/resume.pdf`.
- **Arts gallery** — a lightbox over the `arts` collection.
- **Almost no client JavaScript** — interactivity is small vanilla scripts and
  Astro components (see [ADR-0002](docs/adr/0002-astro-native-remove-react.md)).
- **Correct SEO** — per-page title/description, canonical, `hreflang` alternates,
  Open Graph/Twitter tags, sitemap and `robots.txt`.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Astro](https://astro.build) 5 (`@astrojs/mdx`, `@astrojs/sitemap`) |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4, design tokens in one CSS layer |
| Typography | Comfortaa (headings) + Inter (body) |
| Content | Astro content collections, validated with Zod |
| Tests | [Vitest](https://vitest.dev) (unit) + [Playwright](https://playwright.dev) (e2e) |
| Hosting | [Vercel](https://vercel.com) |
| Package manager | [pnpm](https://pnpm.io) (pinned in `package.json`) |

## Getting started

Requires **Node ≥ 22.12** and **pnpm**.

```sh
pnpm install    # install dependencies
pnpm dev        # dev server at http://localhost:4321
pnpm build      # production build to ./dist/
pnpm preview    # preview the production build
```

The same commands are wrapped in the [`Makefile`](Makefile) — run `make`
(or `make help`) to list them, e.g. `make dev`, `make build`.

### Tests

```sh
pnpm check       # typecheck (astro check)
pnpm test        # Vitest unit suite
pnpm test:e2e    # build, then Playwright against the preview
```

CI runs all three on every PR and push to `main`
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Project layout

The repo is **flat** (see [ADR-0007](docs/adr/0007-flatten-repo-layout.md)):
the Astro project files sit at the root next to the docs.

```
src/
  pages/          # routes (EN at the root, RU under pages/ru/)
  components/     # Astro components + small vanilla scripts
  content/        # the content collections (experience, education, projects, arts, skills)
  layouts/        # Layout, BaseHead
  lib/            # deep, tested modules (i18n, theme, seo, enrichment, order…)
  i18n/           # RU/EN translation tables
  styles/         # design tokens + global CSS
docs/
  adr/            # accepted decisions (0001–0011)
  specs/          # portfolio-v2 spec
  agents/         # tracker, triage labels, domain notes
GLOSSARY.md       # the shared language
AGENTS.md         # working notes for agents
```

## Authoring content

Every entry is one markdown file per Locale with typed frontmatter, validated at
build time — a mistyped or missing field fails the build rather than shipping
broken. Collections: `experience`, `education`, `projects`, `arts` (each
per-Locale) and `skills` (locale-independent). Display order comes from the
`order.json` manifest next to each collection's files, not an `order` field.
See [`src/content.config.ts`](src/content.config.ts) and
[ADR-0004](docs/adr/0004-content-model.md).

## Documentation

- [`GLOSSARY.md`](GLOSSARY.md) — the shared vocabulary; if a word there disagrees
  with the code, the code is wrong.
- [`docs/adr/`](docs/adr/) — accepted decisions, from staying on Astro to the
  anti-FOUC strategy and the content model.
- [`docs/specs/portfolio-v2.md`](docs/specs/portfolio-v2.md) — the current spec
  (mirror of the GitHub Spec issue).
- [`AGENTS.md`](AGENTS.md) — how we work and how to navigate the code.

## Deployment

Deploys to **Vercel** with default build settings. The only extra config is
`vercel.json`, which keeps the retired `/en/*` URLs alive by redirecting them to
their unprefixed equivalents at the edge (a static build cannot emit a wildcard
redirect). The deploy origin lives in exactly one place, `HOMEPAGE_URL` in
[`src/consts.ts`](src/consts.ts); canonical URLs, `og:url`, `og:image` and the
sitemap all derive from it.
