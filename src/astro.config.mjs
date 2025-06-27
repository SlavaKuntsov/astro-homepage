// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';
import { HOMEPAGE_URL } from './src/consts';

// https://astro.build/config
export default defineConfig({
  site: HOMEPAGE_URL,
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react(), mdx()],
  experimental: {
    fonts: [{
      provider: fontProviders.google(),
      name: "Comfortaa",
      weights: [300, 400, 500, 600, 700],
      cssVariable: "--font-roboto"
    }]
  },
  i18n: {
    locales: ["ru", "en"],
    defaultLocale: "en"
  }
});