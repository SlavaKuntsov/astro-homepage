# ADR-0002: Remove React from the client; go Astro-native

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Interactivity today is React islands (`ThemeToggle`, `LanguageToggle`,
`DropdownMenuDemo`, `Carousel`) built on shadcn/Radix + embla. They ship React,
ReactDOM, and Radix to the browser for what is mostly trivial UI. React hydration
also causes the theme/language **Flash** and pop-in of the toggle buttons
(SSR renders a placeholder `<div>`).

## Decision

Remove React and shadcn/Radix from the Site. Reimplement:

- theme toggle → a tiny vanilla-JS script + server-rendered button,
- language switcher → a plain server-rendered link (works without JS),
- mobile menu → native `<details>`/`popover` + a minimal script,
- arts gallery/lightbox → Astro component + a small script.

The client JS budget becomes a few kilobytes of inline/vanilla scripts.

## Consequences

- No hydration step → the **Flash** sources tied to React disappear.
- One less build integration (`@astrojs/react`) and a much smaller dependency
  tree to maintain.
- Interactive components are written in plain TS/Astro; complexity budget must be
  watched (see `codebase-design`: keep modules deep, not shallow).
