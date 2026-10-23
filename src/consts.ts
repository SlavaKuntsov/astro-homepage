// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Slava Kuntsov - Homepage';
export const SITE_DESCRIPTION = 'Welcome to my website!';
export const HOMEPAGE_URL = 'https://slava-homepage.vercel.app/';

/** The owner's name as it appears in the Site chrome. */
export const OWNER_NAME = 'Sviataslau Kuntsov';

/**
 * Locale-independent links to the owner. The Header/Footer use them now; the
 * contacts section (#8) reuses the same list instead of duplicating targets.
 */
export const SOCIAL_LINKS = [
	{ label: 'GitHub', href: 'https://github.com/SlavaKuntsov' },
	{ label: 'Telegram', href: 'https://t.me/slava_kunz' },
	{ label: 'Instagram', href: 'https://www.instagram.com/slava_kunz_' },
] as const;
