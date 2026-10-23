import { test as base, expect } from '@playwright/test';

/**
 * Seeds `localStorage` before any page script runs, so the anti-FOUC script
 * (ADR-0003) reads the intended `theme` on the very first frame:
 *
 *   await seedLocalStorage({ theme: 'dark' });
 *   await page.goto('/');
 *
 * `prefers-color-scheme` is emulated natively by Playwright — set it per suite
 * with `test.use({ colorScheme: 'dark' })`, or rely on the `light` default in
 * `playwright.config.ts`.
 */
export const test = base.extend<{
	seedLocalStorage: (entries: Record<string, string>) => Promise<void>;
}>({
	seedLocalStorage: async ({ context }, use) => {
		await use(async entries => {
			await context.addInitScript((entries: Record<string, string>) => {
				for (const [key, value] of Object.entries(entries)) {
					window.localStorage.setItem(key, value);
				}
			}, entries);
		});
	},
});

export { expect };
