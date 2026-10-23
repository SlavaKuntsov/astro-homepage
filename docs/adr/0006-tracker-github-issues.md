# ADR-0006: Track the work in GitHub Issues

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

The work is a multi-step refactor. The owner wants a plan, docs, and tickets
before implementation, and already hosts the repo on GitHub (`SlavaKuntsov/astro-homepage`,
`gh` authenticated with `repo` scope).

## Decision

Use GitHub Issues as the **Tracker**:

- One parent **Spec** issue (mirrored at `docs/specs/portfolio-v2.md`).
- One **Ticket** per tracer-bullet slice, with a "Blocked by" section referencing
  the blocking issues by number, plus labels.

Labels: `spec`, `phase` (grouping), and `ready-for-agent` (grabbable by an
agent). Native sub-issue / dependency links are set opportunistically via
`gh api`; the textual "Blocked by" section is the source of truth because the
installed `gh` (2.92) has no first-class flags for them.

Rep docs (`GLOSSARY.md`, `docs/adr/*`) live in the repo; only the Spec and
Tickets live on the Tracker.

## Consequences

- Tickets are visible next to PRs; PRs close tickets with `Closes #N`.
- The in-repo spec is a mirror, so the repo is self-describing offline.
- No extra tracker (Linear/Notion) to maintain.
