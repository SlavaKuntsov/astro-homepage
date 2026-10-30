/**
 * Locale routing for the Site (ADR-0011): the default Locale `en` is served at
 * the unprefixed root, `ru` under `/ru/…`. The server-rendered language
 * switcher and the localized navigation hrefs are both built from these two
 * pure functions, which hide the prefix rule from their callers.
 */

/** One of the Site's two Locales. */
export type Locale = 'ru' | 'en';

/** EN is the default Locale and is served without a prefix (ADR-0011). */
const DEFAULT_LOCALE: Locale = 'en';

/** The URL prefix carrying the non-default Locale. */
const RU_PREFIX = '/ru';

/** The Locale a pathname is served in: `/ru/*` is `ru`, everything else `en`. */
export function localeOf(pathname: string): Locale {
	return pathname === RU_PREFIX || pathname.startsWith(`${RU_PREFIX}/`)
		? 'ru'
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
		localeOf(path) === 'ru' ? path.slice(RU_PREFIX.length) || '/' : path;

	if (target === 'ru') return rest === '/' ? RU_PREFIX : `${RU_PREFIX}${rest}`;
	return rest;
}
