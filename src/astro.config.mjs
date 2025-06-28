// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import { HOMEPAGE_URL } from './src/consts'; 
import transitions from 'astro-transitions';

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
  integrations: [react(), mdx(), transitions()],
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Comfortaa',
        weights: [300, 400, 500, 600, 700],
        cssVariable: '--font-roboto',
      },
    ],
  },
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'en',
  },
});