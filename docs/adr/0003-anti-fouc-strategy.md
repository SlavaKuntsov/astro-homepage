# ADR-0003: Anti-FOUC strategy for theme and locale

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

Both the theme and the language state were resolved on the client after
hydration, so the server-rendered HTML painted the wrong state first — the
**Flash**. The body also carries `transition-colors duration-500`, which animates
the flash, making it more visible.

## Decision

1. **Blocking inline script** (`is:inline`, in `<head>`, before styles): read
   `localStorage.theme` (fallback `prefers-color-scheme`), set `data-theme` and
   `color-scheme` on `<html>`. Runs before first paint.
2. **Defer transitions**: color transitions are enabled only after load (a
   `theme-ready` class added once mounted), so the initial paint never animates.
3. **Locale is server-rendered**: the correct `<html lang>`, nav labels, and the
   language-switch link are produced by the server per route. No client JS
   resolves the locale.
4. **View Transitions**: keep `ClientRouter` with `transition:persist` on the
   header/footer. The `<html>` element and its `data-theme` attribute survive
   swaps, so theme is not re-resolved on navigation. The persist keys include
   the Locale (`site-header-<lang>` / `site-footer-<lang>`): same-Locale
   navigation keeps the chrome, while a Locale switch replaces it with the
   other Locale's server-rendered labels.

## Consequences

- Theme is correct on the very first frame; locale never flashes.
- `data-theme` (not a `.dark` class) becomes the canonical theme hook in CSS.
- The theme toggle must read its initial state from the DOM, never recompute it.
- The persisted shell must not cache a stale DOM node: scripts re-query the
  current header/menu after a swap, because a cross-Locale navigation may have
  replaced it.
- A Playwright test asserts there is no wrong-theme frame on load and navigation
  (ADR-0006 / testing decisions in the spec).
