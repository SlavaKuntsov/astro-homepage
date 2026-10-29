// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
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
		react(),
		mdx(),
		// Emit `sitemap-index.xml` + `sitemap-0.xml`. The i18n option adds an
		// `<xhtml:link rel="alternate">` set to each URL so crawlers pair the
		// ru/en pages. The hreflang values are the same as the `<head>`'s
		// alternates (`src/layouts/BaseHead.astro`), so the two always agree.
		sitemap({
			i18n: {
				defaultLocale: 'ru',
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
	// RU is the default Locale at the unprefixed root, EN under `/en/…`
	// (ADR-0005). The prefix rule itself lives in `src/lib/i18n.ts`.
	i18n: {
		locales: ['ru', 'en'],
		defaultLocale: 'ru',
		routing: { prefixDefaultLocale: false },
	},
	// Old Site URLs keep working (spec user story 30): the previous Site served
	// the default Locale under `/ru/*`, so each of its three routes redirects to
	// the unprefixed equivalent. `/works` became `/projects` in ticket #9, so
	// both the legacy `/ru/works` and the retired `/works` land there. That
	// legacy URL set is frozen, and a static build cannot emit a `/ru/*`
	// wildcard, so this map is complete.
	redirects: {
		'/ru': '/',
		'/ru/works': '/projects',
		'/ru/arts': '/arts',
		'/works': '/projects',
	},
});
