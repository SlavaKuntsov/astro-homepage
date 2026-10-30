// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import { HOMEPAGE_URL } from './src/consts';

export default defineConfig({
	site: HOMEPAGE_URL,
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
	},
	integrations: [
		mdx(),
		// Emit `sitemap-index.xml` + `sitemap-0.xml`. The i18n option adds an
		// `<xhtml:link rel="alternate">` set to each URL so crawlers pair the
		// ru/en pages, using the same `ru`/`en` hreflang values as the page
		// `<head>`; the `<head>` additionally declares `x-default`, which this
		// sitemap schema cannot carry.
		sitemap({
			i18n: {
				defaultLocale: 'en',
				locales: { ru: 'ru', en: 'en' },
			},
		}),
	],
	experimental: {
		// Typography tokens are consumed through `--font-heading` / `--font-body`
		// in `global.css`. Both families must carry `cyrillic` for the RU Locale;
		// the optimized fallbacks Astro generates keep the swap shift-free.
		fonts: [
			{
				provider: fontProviders.google(),
				name: 'Comfortaa',
				cssVariable: '--font-comfortaa',
				weights: ['300 700'],
				subsets: ['latin', 'cyrillic'],
				fallbacks: ['ui-rounded', 'system-ui', 'sans-serif'],
			},
			{
				provider: fontProviders.google(),
				name: 'Inter',
				cssVariable: '--font-inter',
				weights: ['100 900'],
				subsets: ['latin', 'cyrillic'],
				fallbacks: ['system-ui', 'sans-serif'],
			},
		],
	},
	// EN is the default Locale at the unprefixed root, RU under `/ru/…`
	// (ADR-0011). The prefix rule itself lives in `src/lib/i18n.ts`.
	i18n: {
		locales: ['ru', 'en'],
		defaultLocale: 'en',
		routing: { prefixDefaultLocale: false },
	},
	// Old Site URLs keep working (spec user story 30). Two legacy shapes are in
	// play. The original Site served EN at the unprefixed root and RU under
	// `/ru/*`, so those routes are the Site's own routes again and need no
	// redirect. The interim ADR-0005 build flipped that (RU at `/`, EN under
	// `/en/*`); a static build cannot emit a wildcard redirect, so that
	// catch-all lives in `vercel.json` at the edge instead. Here only the
	// `works → projects` rename (ticket #9) survives, in both Locales.
	redirects: {
		'/works': '/projects',
		'/ru/works': '/ru/projects',
	},
});
