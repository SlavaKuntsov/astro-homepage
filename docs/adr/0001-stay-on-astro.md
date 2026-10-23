# ADR-0001: Stay on Astro instead of migrating to Next.js

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

The current Site (Astro 5 + React islands) has a visible defect: on reload and on
client-side navigation, the wrong theme flashes for a moment, and the language
toggle behaves the same way. The owner considered moving to Next.js to fix it.

The Site is almost entirely static content (experience, projects, arts, CV) with
light interactivity (theme, language switch, mobile menu, gallery).

## Decision

Stay on Astro. The flash is an implementation defect, not a framework property:
it is caused by applying the theme only after React hydration, with no
pre-paint script. Next.js does not fix it either — `next-themes` uses the same
blocking inline-script technique. Astro's content collections are a better fit
for the typed, markdown-driven content this Site needs, ship far less client JS,
and deploy natively on Vercel.

## Consequences

- We fix the **Flash** with an **Anti-FOUC script** (ADR-0003), not by changing
  frameworks.
- We keep content in markdown **content collections** (ADR-0004).
- If the Site later needs heavy interactive app surfaces, this decision is
  revisited.
