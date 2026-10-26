# ADR-0008: Locale-independent `skills` collection

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

ADR-0004 models content collections as per-locale markdown with a long-form
body: `experience/{ru,en}/<slug>.md`. Skills do not fit that shape. The
technology names (`C#`, `PostgreSQL`, `Docker`) read identically in both
Locales, and a group has no prose body — only a small structured list. Copying
the per-locale layout would duplicate the same list under `ru/` and `en/`, so
the two could drift apart for no gain. The spec's Implementation Decisions
already call for "a shared, non-localized module" to hold skills.

## Decision

Add `skills` as the one **locale-independent** collection: one markdown file per
group under `src/content/skills/<group-id>.md`, with a Zod-validated frontmatter
(`skills`). The group id is the filename, read from the entry id rather
than frontmatter; `skillGroupIdOf` throws on a name outside the known ids, so a
mistyped file fails the build. The group *labels* stay localized in the
translation tables (`t.skills.groups`), keyed by the id.

## Consequences

- Skills are authored as content and validated at build, like experience.
- The list exists once, so RU and EN can never disagree about it.
- This is the only collection not under `{ru,en}/`; ADR-0004's "all per-locale"
  rule now has this documented, deliberate exception.
- The Skills section on home and CV reads the same collection, so the two pages,
  like experience, cannot drift.
