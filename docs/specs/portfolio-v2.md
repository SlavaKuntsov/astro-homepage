# Spec: Portfolio v2 — beautiful, fast, no-flash

- **Status:** ready-for-agent
- **Tracker:** GitHub Issues (parent issue), mirror of `docs/specs/portfolio-v2.md`
- **Related:** `GLOSSARY.md`, `docs/adr/0001..0007`

## Problem Statement

The current Site is a half-finished Astro starter: `/works` and `/arts` are empty
stubs, there is no resume content, and the visible interactivity is broken in a way
that looks unprofessional —

- On reload (and on navigation) the **wrong theme flashes** for a moment before the
  real theme appears, because the theme is applied only after React hydration.
- The **language toggle flashes and pops in** for the same reason, and the language
  state is resolved on the client instead of the server.
- The theme/language buttons render as a layout-shifting placeholder until JS loads.
- Fonts, metadata, and canonical URLs are misconfigured (preloads declare the wrong
  MIME type; `HOMEPAGE_URL` is an invalid placeholder so OG/canonical are broken).

From the owner's perspective: the Site does not yet present their three years of
backend experience as a recruiter-ready resume, its showcase areas are empty, and
the first thing a visitor sees is a flicker of the wrong theme.

## Solution

A refactored, Astro-native version of the Site that:

- **Never flashes** — the correct theme and locale are correct on the very first
  frame, on reload and on navigation.
- Presents the **resume as typed markdown content collections** (experience,
  skills) so it is easy to maintain and impossible to render untyped.
- Adds real **Projects** pages (index + detail, images, links, optional build-time
  GitHub enrichment for public repos) and an **Arts** gallery with a lightbox.
- Adds a print-optimized **CV** page plus a downloadable PDF.
- Ships **almost no client JavaScript** and keeps the warm, personal aesthetic of
  the current Site, but cleaner and more modern.
- Stays on **Vercel**.

## User Stories

1. As a recruiter, I want the home page to load instantly without any theme flash,
   so that I perceive the Site as professionally built.
2. As a recruiter, I want to see the owner's name, title, and a one-line pitch
   above the fold, so that I immediately know who this is.
3. As a recruiter, I want an ordered work-experience timeline with company,
   position, dates, and a description of what was done, so that I can assess fit.
4. As a recruiter, I want each experience entry to list the technologies used, so
   that I can match the stack against my role.
5. As a recruiter, I want a "Download CV" action that gives me a PDF, so that I can
   keep it for later.
6. As a recruiter, I want a `/cv` page I can print cleanly to PDF, so that I can
   archive the resume from the browser.
7. As a recruiter, I want to see showcased projects with a screenshot, a short
   description, and links to the live site and source, so that I can judge quality.
8. As a recruiter, I want private projects to still be described in text and image
   even without a public link, so that I can see the breadth of work.
9. As a visitor who prefers Russian, I want the Site in Russian by default at `/`,
   so that it reads naturally.
10. As a visitor who prefers English, I want to switch to English and stay on the
    exact same page, so that I do not lose my place.
11. As a visitor, I want the language switcher to work even with JavaScript
    disabled, so that the Site is robust.
12. As a visitor, I want to choose dark or light theme and have it persist across
    pages and reloads, so that I am not annoyed on every visit.
13. As a visitor with `prefers-color-scheme: dark`, I want the Site to start dark
    automatically, so that it respects my system.
14. As a visitor on a phone, I want a usable navigation menu, so that I can reach
    every page.
15. As a visitor, I want smooth page transitions without the header jumping, so
    that navigation feels polished.
16. As a visitor, I want a gallery of the owner's art with a lightbox, so that I
    can view images larger.
17. As a visitor, I want the Sites' links (Telegram, email, GitHub, Instagram)
    clearly listed, so that I can make contact.
18. As the owner, I want to add or edit an experience entry by editing one
    markdown file per locale, so that maintaining the resume takes minutes.
19. As the owner, I want a missing or mistyped frontmatter field to fail the build,
    so that I never ship a broken entry.
20. As the owner, I want a project that links a public GitHub repo to optionally
    show the repo's tags (its topics) and language breakdown pulled at build time,
    so that the page stays fresh with little effort.
21. As the owner, I want to redeploy to Vercel with default settings, so that I do
    not maintain custom build config.
22. As the owner, I want the Site to be fast (minimal client JS, optimized fonts,
    responsive images), so that it scores well on Lighthouse.
23. As the owner, I want correct page titles, descriptions, canonical URLs, and
    Open-Graph tags per page and locale, so that links look right when shared.
24. As the owner, I want a sitemap and robots file, so that search engines index
    the Site.
25. As the owner, I want accessible pages (keyboard navigation, focus states, AA
    contrast), so that everyone can use the Site.
26. As a screen-reader user, I want meaningful labels and roles on interactive
    elements (theme toggle, menu, lightbox), so that I can operate them.
27. As the owner, I want automated tests that catch a regression in the no-flash
    behaviour, so that a future change cannot silently reintroduce it.
28. As an agent, I want the repo to have a `GLOSSARY.md` and ADRs, so that I use
    consistent language and respect prior decisions.
29. As an agent picking up any ticket, I want a flat repository layout with
    obvious paths, so that I can navigate without guessing.
30. As the owner, I want old `/ru/*` URLs to redirect to the new routes, so that
    existing links do not break.

## Implementation Decisions

**Framework & layout**

- Astro (ADR-0001) with `@astrojs/mdx`. React and shadcn/Radix are removed
  (ADR-0002); Tailwind v4 stays.
- Repository is flattened so project files sit at the git root (ADR-0007). This is
  the first prefactor.
- Astro i18n: `locales: ['ru','en']`, `defaultLocale: 'ru'`,
  `prefixDefaultLocale: false` (ADR-0005). `/` is `ru`, `/en/*` is `en`.

**Anti-FOUC (the core fix, ADR-0003)**

- A blocking `is:inline` script in `<head>` sets `data-theme` + `color-scheme` on
  `<html>` from `localStorage.theme` / `prefers-color-scheme`, before first paint.
- Color transitions are gated behind a `theme-ready` class added after load.
- The theme toggle reads initial state from the DOM (never recomputes).
- Locale is resolved entirely server-side; the language switcher is a
  server-rendered link.
- `ClientRouter` is kept; header/footer use `transition:persist`.

The theme contract encoded as a shape (from the grilling session):

```ts
type Theme = 'light' | 'dark';           // persisted at localStorage["theme"]
// DOM contract: <html data-theme="light"|"dark" style="color-scheme: ...">
// Pre-paint order: (1) read localStorage, (2) else matchMedia prefers-color-scheme,
// (3) default "light".
```

**Content collections (ADR-0004)**

- `experience/{ru,en}/<slug>.md` — frontmatter: `company`, `companyUrl?`,
  `position`, `start`, `end?` or `current: boolean`, `location?`,
  `employmentType?`, `industries?: string[]`, `summary`, `highlights: string[]`,
  `environment: string[]`. Body: long-form markdown.
- `projects/{ru,en}/<slug>.md` — frontmatter: `title`, `summary`, `cover?`,
  `images?: string[]`, `stack: string[]`, `links?: { live?, github?, other? }`,
  `visibility: 'public' | 'private'`, `featured?: boolean`, optional
  `githubRepo?: string` (owner/repo) to trigger enrichment.
- `arts/{ru,en}/<slug>.md` — frontmatter: `title`, `image`, `tags?: string[]`,
  `link?`.
- `skills/<group-id>.md` — the one locale-independent collection (ADR-0008):
  frontmatter `skills: string[]`; only the group's label is localized.
- Display order comes from a per-collection `order.json` manifest (a list of the
  slugs, or group ids), not an `order` field (ADR-0009).
- Locale pairing is by matching `slug` across `ru/` and `en/` folders.
- A shared, non-localized module holds locale-independent data (owner links,
  navigation) — used by header/footer/CV.

**Projects enrichment**

- At build time, for projects with `visibility: 'public'` **and** a `githubRepo`,
  fetch the repo's stars, topics, primary language, description, and language
  breakdown from the GitHub API and cache the result. The repo's topics become the
  project's tags (the manual `stack` is the fallback) and the manual `summary`
  always wins on conflict; the breakdown renders as the language list. Enrichment
  failure must not fail the build.

**Pages**

- `/` (ru) and `/en/` — home: hero, about, experience highlights, featured
  projects, arts preview, contacts.
- `/experience` + `/en/experience` — full experience timeline.
- `/projects`, `/projects/<slug>` (+ `/en/…`) — index and detail.
- `/arts` (+ `/en/arts`) — gallery with lightbox.
- `/cv` (+ `/en/cv`) — print-optimized resume, generated from `experience` and
  skills, plus a link to `/resume.pdf` (a static file placed in `public/`).
- 404 page.

**Interactivity (all vanilla/Astro)**

- Theme toggle: server-rendered `<button>` + tiny script.
- Language switcher: server-rendered `<a>` mapping current path to other locale.
- Mobile menu: `<details>`/popover + minimal script.
- Arts lightbox: Astro component + small script (no dependency).

**Design**

- Evolve the current warm cream/orange aesthetic: keep it as the identity, modernize
  typography, spacing, and motion.
- Typography: Comfortaa for headings/accents, Inter for body text; self-host or use
  Astro's font provider with correct preload MIME types.
- Design tokens (colors, radii, spacing) centralized in one CSS layer; `data-theme`
  drives light/dark.

**Metadata**

- Fix `HOMEPAGE_URL` to the real origin (`https://slava-homepage.vercel.app` for
  now) so canonical/OG are valid.
- Per-page `<title>`, description, canonical, `hreflang` alternates, OG/Twitter
  tags. Sitemap + `robots.txt`.

## Testing Decisions

**What makes a good test here.** Tests assert externally observable behavior a user
could verify in a browser — never internal component structure. For this Site the
highest-value behaviors are: the theme is correct on the first frame, the locale is
correct and switchable, navigation does not lose theme/language, and content renders
from markdown.

**Seams.** There is one external seam per concern:

1. **The rendered page (browser)** — Playwright drives the real built site. This is
   the primary seam and covers theme, locale, navigation, content rendering, and
   the lightbox. It is the only seam that can actually observe a Flash.
2. **The content schemas + pure helpers** — Vitest exercises Zod schemas and pure
   functions (path↔locale mapping, GitHub-enrichment merge, slug pairing) directly.

No new seams are introduced; we reuse Astro's build and Vercel preview.

**Modules tested**

- Playwright: no-Flash on load and on navigation; theme toggle persists across
  reload/navigation; `prefers-color-scheme` honored on first visit; language switch
  preserves the current path; `/` is RU and `/en/` is EN; experience/projects/arts
  render; lightbox opens/closes; mobile menu opens; old `/ru/*` redirects.
- Vitest: experience/projects/arts schemas reject bad frontmatter; locale path
  mapping is a round-trip; enrichment merge prefers manual fields; slug pairing
  matches across locales.

**Prior art.** None yet in the repo (the current Site has no tests). The Playwright
no-Flash test is new and is the reference for "does a change reintroduce the
defect".

## Out of Scope

- Blog / notes section, CMS/admin UI, comments.
- Analytics and tracking.
- Locales beyond `ru`/`en`.
- On-the-fly PDF generation (a static `resume.pdf` is used).
- Scraping or driving third-party sites; only the official GitHub API is used, and
  only for public repos.
- Renaming the working directory / GitHub repository.
- Any framework migration (explicitly decided against, ADR-0001).

## Further Notes

- The Resume PDF for 2026-10-23 was read and its content (4 roles at БМРЦ,
  HyperQuant, MODSEN, Avtobus1.ru; BGTU 2026; ~30 skills; RU/EN B1) is the source
  for the markdown content entries.
- The `Flash` is the single most important acceptance criterion: every UI ticket
  must not regress it, and the Playwright test is the guard.
- Keep modules deep (see `codebase-design`): the theme module and the i18n path
  module should expose small interfaces and hide the details (storage keys, DOM
  attributes, prefix rules).
