# ADR-0004: Content model — per-locale markdown collections

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Experience, projects, and arts need typed fields (company, position, dates,
descriptions, links, images) and two locales. Options were: one markdown file per
entry with both languages inside, or one file per locale.

The owner explicitly wants resume experience "like Astro pages from md files".

## Decision

Use Astro **content collections** with one markdown file per **locale**:

```
src/content/experience/{ru,en}/<slug>.md
src/content/projects/{ru,en}/<slug>.md
src/content/arts/{ru,en}/<slug>.md
```

Each collection has a Zod schema for its frontmatter; the markdown body holds the
long-form description. `slug` must match across the two locale folders so a page
can pair them.

## Consequences

- Types are enforced at build time; a missing field fails the build.
- Content is easy to author and diff; markdown body is real markdown.
- A shared non-localized data file holds locale-independent fields where useful
  (e.g. project `links`, `stack`, `order`, company URL).
- Pages are generated per locale; pairing is by slug.
