# AGENTS.md

Working notes for agents in this repo. This file is a **pointer**, not a manual:
the environment and the domain docs are the sources of truth.

## What this is

The RU/EN portfolio & resume **Site** for Sviataslau Kuntsov — Astro, deployed to
Vercel. Visitors are recruiters and the wider community; the content is the resume
plus a showcase (projects, arts). Use the vocabulary in `GLOSSARY.md` in code,
tickets, and commits; if a word there disagrees with the code, the code is wrong.

## Read these when the work touches them

- `GLOSSARY.md` — the shared language. Read it before naming anything.
- `docs/adr/` — accepted decisions: stay on Astro, drop React, anti-FOUC,
  content collections, i18n scheme, tracker, layout. Respect them; if a task
  contradicts an ADR, say so before proceeding.
- `docs/specs/portfolio-v2.md` — the current spec (mirror of GitHub Spec Issue #1).

## How we work

We work with the **mattpocock/skills** method
(https://github.com/mattpocock/skills, installed via skills.sh). The flow:

**grilling → domain docs → spec → tickets → implement (TDD) → code review → PR.**

Align before building: `grill-with-docs` interviews you and maintains the domain
model; `to-spec` and `to-tickets` turn that into a spec and tracer-bullet tickets.
For hard bugs reach for `diagnosing-bugs`; for sourced answers, `research`; for
throwaway design questions, `prototype`. Keep modules deep (`codebase-design`) and
review the diff on two axes (`code-review`) before opening a PR.

- Work the **frontier**: tickets whose blockers are all closed. Close a ticket
  from its PR with `Closes #N`; the **Spec** is Issue #1.

## Agent skills

### Issue tracker

GitHub Issues on this repo, driven with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to the same label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

The end-to-end pipeline — stages, modes, branches, where artifacts land — is `docs/dev-pipeline.md`.

## Navigating the code

This repo has a **CodeGraph** index (`.codegraph/`). Reach for it BEFORE grep or
reading files: one call returns the relevant symbols' verbatim source plus the
call paths between them, including dynamic-dispatch hops grep can't follow.

- MCP tool: `codegraph_explore({ query, projectPath })` — pass this repo's path.
- Shell: `codegraph explore "<symbols or question>"`.

Fall back to grep/glob/read only when `.codegraph/` is absent.

## Rules that must not regress

- **No Flash.** The theme (`data-theme` on `<html>`) and the Locale are correct on
  the first frame and across navigation. Set them before paint — never resolve
  them in client JS after hydration. The Playwright no-Flash test is the guard;
  keep it green.
- **Astro-native.** No React, Radix, or shadcn (ADR-0002). Interactivity is small
  vanilla scripts and Astro components.
- **Content lives in content collections** — one markdown file per Locale under
  the `experience`, `projects`, and `arts` collections, validated by Zod.
  Mistyped frontmatter fails the build (ADR-0004).
- **RU is the default Locale** at `/`; English lives under `/en/` (ADR-0005).
- **Design tokens** are centralised and light/dark is driven by `data-theme`;
  typography is Comfortaa (headings) + Inter (body).

## Layout note

The repo is flat: the Astro project files (`package.json`, `astro.config.mjs`,
`tsconfig.json`, `src/`, `public/`) live at the repo root alongside `docs/`,
`GLOSSARY.md`, and `AGENTS.md`. There is no nested project directory. This repo
uses **pnpm**; build approvals for native deps live in `pnpm-workspace.yaml`.

## Commands

Read them from `package.json` — that file is the source of truth, not a copy here
(`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`).

## Commits

Conventional Commits, as the existing history shows (`feat:`, `fix:`, `style:`,
`chore:`, `docs:`).
