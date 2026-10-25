/**
 * Locale routing for the Site (ADR-0005): the default Locale `ru` is served at
 * the unprefixed root, `en` under `/en/…`. The server-rendered language
 * switcher and the localized navigation hrefs are both built from these two
 * pure functions, which hide the prefix rule from their callers.
 */

/** One of the Site's two Locales. */
export type Locale = 'ru' | 'en';

/** RU is the default Locale and is served without a prefix (ADR-0005). */
const DEFAULT_LOCALE: Locale = 'ru';

/** The URL prefix carrying the non-default Locale. */
const EN_PREFIX = '/en';

/** The Locale a pathname is served in: `/en/*` is `en`, everything else `ru`. */
export function localeOf(pathname: string): Locale {
	return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)
		? 'en'
		: DEFAULT_LOCALE;
}

/** Trims trailing slashes so `/arts/` and `/arts` compare equal. */
export function normalizePath(path: string): string {
	const trimmed = path.replace(/\/+$/, '');
	return trimmed === '' ? '/' : trimmed;
}

/** The same path expressed in the target Locale, for the switcher and hrefs. */
export function localizePath(pathname: string, target: Locale): string {
	const path = normalizePath(pathname);
	const rest =
		localeOf(path) === 'en' ? path.slice(EN_PREFIX.length) || '/' : path;

	if (target === 'en') return rest === '/' ? EN_PREFIX : `${EN_PREFIX}${rest}`;
	return rest;
}
