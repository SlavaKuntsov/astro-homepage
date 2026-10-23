// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
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
	integrations: [react(), mdx()],
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
	i18n: {
		locales: ['ru', 'en'],
		defaultLocale: 'en',
	},
});
