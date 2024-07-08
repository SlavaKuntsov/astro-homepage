import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react";

import tailwind from "@astrojs/tailwind";
import { HOMEPAGE_URL } from './src/consts';

// https://astro.build/config
export default defineConfig({
  site: HOMEPAGE_URL,
  integrations: [mdx(), sitemap(), react(), tailwind()]
});