# Glossary

The shared language for this project. Every doc, ticket, and commit uses these
terms exactly. If a term here conflicts with a term in code, the code is wrong.

## Domain

**Site** — this repository's RU/EN portfolio & resume website, deployed on
Vercel. _Avoid_: homepage (ambiguous with the Astro starter page).

**Locale** — one of exactly two language variants: `ru` (default) and `en`.
_Avoid_: language, lang-code.

**Resume** — the source PDF authored outside the repo
(`Резюме_Software_Developer_..._от_23_10_2026.pdf`); the human-owned source of
truth for experience, education, and skills. _Avoid_: cv (see **CV**).

**CV** — the Site's own `/cv` page, generated from **content collections** and
print-optimized, plus a downloadable static `resume.pdf`. _Avoid_: resume.

## Content

**Content collection** — one of the Astro collections: `experience`,
`projects`, `arts` (each per-**locale**) and `skills` (locale-independent, see
ADR-0008). _Avoid_: data folder, content dir.

**Skill group** — one group of the owner's skills (`languages`, `backend`, …),
authored as `skills/<id>.md`; the skills themselves are locale-independent while
the group's label is localized. _Avoid_: skill tag, category.

**Experience entry** — one role at one company, authored as a single markdown
file with typed frontmatter (company, company URL, position, dates, location,
employment type, industries, summary, highlights, environment).
_Avoid_: job, position.

**Project** — a showcased piece of work: manual fields (title, description,
images, links, stack) plus optional build-time enrichment from a public GitHub
repo. _Avoid_: repo, work.

**Artwork** — a gallery image item in the `arts` collection, opened in a
lightbox. _Avoid_: art, picture.

**Enrichment** — build-time fetching of public metadata (stars, tags from the
repo's topics, primary language, description, and language breakdown) for a
**Project** whose source repo is public. Never required; an authored
`summary` wins over the repo's description, and the manual `stack` backs up the
tags when the repo has no topics. _Avoid_: scraping, sync.

**Order manifest** — the `order.json` next to a collection's files, listing the
slugs (or group ids) in display order; the single source of a collection's
display order (ADR-0009). Featured **Projects** lead the index, and the manifest
orders the rest. _Avoid_: sort field, priority.

## Presentation

**Theme** — `light` or `dark`, persisted in `localStorage` under the key
`theme`, applied as `data-theme` on the `<html>` element. _Avoid_: mode, color
scheme.

**Flash** — any brief paint of the wrong theme or locale during load or
navigation; the defect this project exists to remove. (a.k.a. FOUC.)
_Avoid_: flicker, blink, jump.

**View Transition** — a client-side navigation performed by Astro's
`ClientRouter`, with the header/footer marked `transition:persist`.

**Anti-FOUC script** — the tiny blocking `is:inline` script in `<head>` that
sets `data-theme` (and `color-scheme`) before first paint.

## Process

**Tracker** — GitHub Issues on `SlavaKuntsov/astro-homepage`.

**Spec** — the parent issue describing the whole change;
`docs/specs/portfolio-v2.md` is its mirror in-repo.

**Ticket** — a tracer-bullet vertical slice of work, published as a GitHub
issue, declaring its **blocking edges**. _Avoid_: task, story.

**Blocking edge** — the set of tickets that must be done before a ticket can
start. A ticket whose edges are all satisfied is on the **frontier**.
