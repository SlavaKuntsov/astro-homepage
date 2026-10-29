/**
 * The SEO vocabulary the `<head>` and the sitemap share. Two things differ
 * between a Locale and how crawlers name it:
 *
 * - the `hreflang` alternates of a page (each Locale's counterpart path plus an
 *   `x-default` for the default Locale), and
 * - Open Graph's `language_TERRITORY` locale tag.
 *
 * Both derive from the same path↔Locale rule as the Locale switcher
 * (`localizePath`), so a page's alternates, its switcher target, and its sitemap
 * entry can never disagree.
 */
import { localizePath } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/** The `hreflang` value naming the default Locale's fallback page. */
export const X_DEFAULT = 'x-default';

/** Open Graph's Locale tag per Locale (a different vocabulary than `Locale`). */
export const OG_LOCALE: Record<Locale, string> = {
	ru: 'ru_RU',
	en: 'en_US',
};

export interface LocaleAlternate {
	/** The `hreflang` attribute: a Locale, or `x-default`. */
	hreflang: Locale | typeof X_DEFAULT;
	/** The path (no origin) that serves the counterpart page. */
	path: string;
}

/**
 * Astro builds directory-format URLs (`/projects/index.html` → `/projects/`), so
 * a page's canonical, the sitemap, and these alternates must all end in `/` to
 * name the same URL. `localizePath` returns the normalized (slash-free) form for
 * navigation; here we restore the canonical form.
 */
function directoryUrl(path: string): string {
	return path.endsWith('/') ? path : `${path}/`;
}

/**
 * The `hreflang` alternates for a page: each Locale's counterpart path plus an
 * `x-default` pointing at the default Locale (ADR-0005). The `pathname` is the
 * current page's path, so the pair is always the same page in both Locales, and
 * each href equals that page's own canonical URL.
 */
export function localeAlternates(pathname: string): LocaleAlternate[] {
	const ru = directoryUrl(localizePath(pathname, 'ru'));

	return [
		{ hreflang: 'ru', path: ru },
		{ hreflang: 'en', path: directoryUrl(localizePath(pathname, 'en')) },
		{ hreflang: X_DEFAULT, path: ru },
	];
}
