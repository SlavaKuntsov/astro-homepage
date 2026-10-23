/**
 * The Theme contract (ADR-0003). One module owns the `localStorage` key, the
 * DOM hook, and the pre-paint script; callers import from here instead of
 * re-deriving any of it.
 *
 * The pre-paint script has to be self-contained (it runs inline, before
 * hydration, with no imports), so it is generated here from the same constants
 * the rest of the app uses — the key and attribute can only change in one place.
 */

/** A Theme is one of exactly two values, persisted under `localStorage.theme`. */
export type Theme = 'light' | 'dark';

/** The `localStorage` key the Theme is persisted under. */
export const THEME_STORAGE_KEY = 'theme';

/** The attribute the Theme is applied as on the `<html>` element. */
export const THEME_ATTRIBUTE = 'data-theme';

/** The class that enables color transitions once the Theme has settled. */
export const THEME_READY_CLASS = 'theme-ready';

/**
 * The Anti-FOUC script (ADR-0003): sets `data-theme` and `color-scheme` on
 * `<html>` before first paint, in this order — stored preference, else
 * `prefers-color-scheme`, else `light`. Rendered with `<script is:inline>`.
 */
export const THEME_INIT_SCRIPT = `(function () {
	var stored = null;
	try {
		stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
	} catch (error) {}
	if (stored !== 'light' && stored !== 'dark') {
		stored = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)}, stored);
	document.documentElement.style.colorScheme = stored;
})();`;
