# ADR-0009: Content order comes from a per-collection manifest

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Each entry carried its own `order` field to control where it renders. In
`experience` that field was duplicated across the `ru/` and `en/` files; in
`skills` it was a per-file index. Scattering the order across many files makes
the sequence hard to see and reorder at a glance, and lets copies disagree.

## Decision

A collection's display order comes from one manifest file next to its content:
`src/content/<collection>/order.json` — a list of keys (slugs for `experience`,
group ids for `skills`). The schemas no longer carry `order`, and the pure
helpers (`orderedEntries`, `orderedGroups`) rank entries by their position in the
list through a shared `rankOf`; a key that is not listed sorts last.

For `experience` the list is authored newest-first, and the rendered-page test
still guards that the timeline runs newest → oldest.

## Consequences

- One place to read and change the order, with no per-Locale duplication.
- Adding an entry is a file plus a line in the manifest; unit tests keep the
  manifest and the content files in step.
- The `order` frontmatter field is gone from `experience` and `skills`;
  `projects` and `arts` follow the same pattern when they are built.
