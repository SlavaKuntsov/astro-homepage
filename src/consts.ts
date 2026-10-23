// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Slava Kuntsov - Homepage';
export const SITE_DESCRIPTION = 'Welcome to my website!';
export const HOMEPAGE_URL = 'https://slava-homepage.vercel.app/';

/**
 * Locale-independent links to the owner. The Footer uses them now; the
 * contacts section (#8) reuses the same list instead of duplicating targets.
 */
export const SOCIAL_LINKS = [
	{ label: 'GitHub', href: 'https://github.com/SlavaKuntsov' },
	{ label: 'Telegram', href: 'https://t.me/slava_kunz' },
	{ label: 'Instagram', href: 'https://www.instagram.com/slava_kunz_' },
] as const;
