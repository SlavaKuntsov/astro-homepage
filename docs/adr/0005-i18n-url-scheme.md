# ADR-0005: i18n URL scheme — RU default, no prefix

- **Status:** Superseded by [ADR-0011](0011-en-default-locale.md)
- **Date:** 2026-10-23

## Context

The primary audience is Belarus/RU recruiters, and the Resume is in Russian. The
current Site serves English at `/` and Russian at `/ru/`.

## Decision

Russian is the default **Locale**, served at `/` with no prefix; English is
served under `/en/…`. Astro i18n is configured with `locales: ['ru','en']`,
`defaultLocale: 'ru'`, `prefixDefaultLocale: false`, `routing: { prefixDefaultLocale: false }`.

The language switcher is a server-rendered link that maps the current path to the
same path in the other locale (e.g. `/projects/foo` ↔ `/en/projects/foo`), so
switching never loses the user's place and needs no client JS.

## Consequences

- `/` and every unprefixed route are `ru`; `/en/*` are `en`.
- Canonical URLs and `hreflang` alternate links are emitted per route.
- Old `/ru/*` URLs from the current Site should redirect to the new unprefixed
  routes (handled in the i18n ticket).
