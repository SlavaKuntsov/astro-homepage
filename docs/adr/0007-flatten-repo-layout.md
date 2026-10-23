# ADR-0007: Flatten the repository layout

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

The git repo root is `astro-homepage-old/`, but the Astro project lives one level
deeper in `astro-homepage-old/src/`, producing confusing paths like `src/src/components`
and a `tailwind.config.mjs` inside `src/`. Deploy config and tooling resolution are
awkward.

## Decision

Flatten: move the project files from `astro-homepage-old/src/` up to the git repo
root, so `package.json`, `astro.config.mjs`, `src/`, `public/`, and `docs/` sit at
the root alongside `GLOSSARY.md` and `.gitignore`.

## Consequences

- Normal Vercel root detection; no `vercel.json` root override needed.
- One obvious place for everything; `src/` no longer nests.
- This is a **prefactor** and must land first, before feature work, because every
  subsequent ticket assumes the flat layout.
- The `astro-homepage-old` directory name itself is out of scope here; renaming the
  working directory / repo is a separate concern.
