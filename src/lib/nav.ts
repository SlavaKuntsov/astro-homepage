/**
 * Navigation highlighting for the Site shell. The Header is persisted across
 * View Transitions, so it is rendered once and then re-synced on the client:
 * one pure rule keeps the server render and the client update in agreement.
 */

/** One entry in the Site navigation; `external` links open in a new tab. */
export interface NavItem {
	href: string;
	label: string;
	external?: boolean;
}

/** Trims trailing slashes so `/arts/` and `/arts` compare equal. */
function normalizePath(path: string): string {
	const trimmed = path.replace(/\/+$/, '');
	return trimmed === '' ? '/' : trimmed;
}

/**
 * Whether `href` is the current page or a section containing it. The root link
 * is active only at `/`, never on every route. External links are never active.
 */
export function isActivePath(pathname: string, href: string): boolean {
	if (!href.startsWith('/')) return false;

	const path = normalizePath(pathname);
	const target = normalizePath(href);

	if (target === '/') return path === '/';
	return path === target || path.startsWith(`${target}/`);
}
