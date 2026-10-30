# ADR-0011: EN is the default Locale — supersedes ADR-0005

- **Status:** Accepted
- **Date:** 2026-10-31

## Context

ADR-0005 made Russian the default **Locale**, served at `/` with English under
`/en/…`, on the assumption that the primary audience is Belarus/RU recruiters
and the Resume is in Russian. The Site's audience has since widened: the public
deploy, the projects showcase, and the wider community read English first, and
the previous Site already served English at the unprefixed root. Keeping Russian
as the default buries the English site under a prefix for the larger share of
visitors, and makes the English URLs the awkward ones.

## Decision

English is the default **Locale**, served at `/` with no prefix; Russian is
served under `/ru/…`. Astro i18n is configured with `locales: ['ru','en']`,
`defaultLocale: 'en'`, `routing: { prefixDefaultLocale: false }`.

The language switcher stays a server-rendered link mapping the current path to
the same path in the other Locale (e.g. `/projects/foo` ↔ `/ru/projects/foo`), so
switching never loses the visitor's place and needs no client JS. The one prefix
rule lives in `src/lib/i18n.ts` (`localeOf` / `localizePath`).

Page files physically swap: EN pages sit at the root of `src/pages/`, RU pages
under `src/pages/ru/`. The per-Locale **content collections**
(`src/content/{ru,en}/…`) are untouched — they are keyed by Locale name, not by
which Locale is default.

Because the previous Site already served EN at `/` and RU under `/ru/*`, the
in-config redirect map shrinks to the `works → projects` rename in both Locales
(`/works`, `/ru/works`); `/ru`, `/ru/arts`, and `/ru/experience` are the Site's
own routes again and no longer redirect. The interim ADR-0005 build had served
EN under `/en/*`; a static build cannot emit a wildcard redirect, so that
catch-all (`/en/:path*` → `/:path*`) lives in `vercel.json` at the edge.

## Consequences

- `/` and every unprefixed route are `en`; `/ru/*` are `ru`.
- Canonical URLs, `hreflang` alternates, and `x-default` are emitted per route,
  with `x-default` pointing at the EN counterpart (`src/lib/seo.ts`).
- The sitemap's `defaultLocale` is `en` (`astro.config.mjs`).
- The no-Flash contract is unchanged: the Locale is still resolved on the server,
  never after hydration — only which prefix means which Locale flipped.
- Supersedes ADR-0005.
