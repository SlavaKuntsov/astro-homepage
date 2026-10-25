/**
 * Navigation highlighting for the Site shell. The Header is persisted across
 * View Transitions, so it is rendered once and then re-synced on the client:
 * one pure rule keeps the server render and the client update in agreement.
 */

import { localeOf, localizePath, normalizePath } from './i18n';

/** One entry in the Site navigation; `external` links open in a new tab. */
export interface NavItem {
	href: string;
	label: string;
	external?: boolean;
}

/**
 * Whether `href` is the current page or a section containing it. A Locale's root
 * link (`/` or `/en`) is active only at exactly that root, never on every route
 * beneath it. External links are never active.
 */
export function isActivePath(pathname: string, href: string): boolean {
	if (!href.startsWith('/')) return false;

	const path = normalizePath(pathname);
	const target = normalizePath(href);
	// The root of `href`'s Locale: `/` for ru, `/en` for en.
	const root = localizePath('/', localeOf(target));

	if (target === root) return path === root;
	return path === target || path.startsWith(`${target}/`);
}
