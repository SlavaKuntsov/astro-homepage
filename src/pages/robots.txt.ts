import type { APIRoute } from 'astro';

/**
 * `robots.txt`, generated from the same `site` origin the sitemap uses, so the
 * pointer can never drift from the deploy. `@astrojs/sitemap` emits the index at
 * `/sitemap-index.xml`; crawlers follow it to the per-page chunks.
 */
export const GET: APIRoute = ({ site }) => {
	const sitemap = new URL('sitemap-index.xml', site);

	return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
