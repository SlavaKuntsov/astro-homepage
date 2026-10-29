# ADR-0010: `education` is a per-locale content collection, dated by year

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

The Site's CV — the home page's resume sections (ticket #11) — must render the
owner's education from content, but ADR-0004's content model named only
`experience`, `projects`, and `arts` (plus the locale-independent `skills`,
ADR-0008). The Resume lists one degree — BGTU, 2026, with a faculty and a
programme. Education differs from **Experience** in two ways: it is dated by
year, not by month, and it has no long-form body.

## Decision

Add `education` as a per-locale collection following ADR-0004:
`src/content/education/{ru,en}/<slug>.md`, with a Zod schema
(`src/lib/education.ts`) and a year-grained period — `start`/`end` as `YYYY`, or
`current: true`. Display order comes from `education/order.json` (ADR-0009). The
home page renders it; nothing else consumes it yet.

The `year` field coerces a number to a string, because YAML parses an unquoted
`2022` as an integer; the `YYYY` regex still rejects the month-grained `2022-09`.

## Consequences

- Education is authored and validated like every other collection, so the home
  page's education section cannot render untyped.
- ADR-0004's "all per-locale" rule now covers four collections; `skills`
  (ADR-0008) remains the one locale-independent exception.
- The home page's education section reads the collection through
  `orderedEducation`, the same manifest + `rankOf` shape the experience timeline
  uses.
