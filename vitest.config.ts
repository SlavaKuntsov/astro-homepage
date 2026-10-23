// The reference teaches `astro check` that Vite configs may carry a `test` key.
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Pure logic only: the browser seam is covered by Playwright (`e2e/`).
// Zod content schemas and pure helpers (locale path mapping, GitHub-enrichment
// merge, slug pairing) land here as later tickets introduce them.
//
// `getViteConfig` reuses the Vite setup from `astro.config.mjs`, so the `@`
// alias (and any future Vite plugin) has a single source of truth.
export default getViteConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
