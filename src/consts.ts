// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

/**
 * The Site's canonical origin. Astro's `site` and every absolute URL (canonical,
 * `og:url`, `og:image`, the sitemap) derive from this single value, so the
 * deploy origin lives in exactly one place (spec: fix `HOMEPAGE_URL` to the
 * real origin).
 */
export const HOMEPAGE_URL = 'https://slava-homepage.vercel.app';

/** The default Open Graph/Twitter image for a page that supplies none. */
export const DEFAULT_OG_IMAGE = '/images/ava2.jpg';
