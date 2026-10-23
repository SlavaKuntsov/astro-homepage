import type { Page } from '@playwright/test';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '../src/lib/theme';
import { expect, test } from './fixtures';

/**
 * The no-Flash guard (ADR-0003). The observable contract is the DOM:
 * `<html data-theme="light|dark">` plus `color-scheme`, correct on the very
 * first frame.
 *
 * To prove the Theme is settled *before the first paint* rather than by
 * hydration, the offline assertions block every network script: an inline,
 * blocking `<head>` script must still have applied the Theme. If a change moves
 * the Theme back into a bundled/hydrated script, these tests go red.
 */
async function blockPageScripts(page: Page) {
	await page.route('**/*', route =>
		route.request().resourceType() === 'script'
			? route.abort()
			: route.continue()
	);
}

const themeOf = (page: Page) =>
	page.evaluate(
		attribute => document.documentElement.getAttribute(attribute),
		THEME_ATTRIBUTE
	);

const colorSchemeOf = (page: Page) =>
	page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

const backgroundColorOf = (page: Page) =>
	page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const transitionDurationOf = (page: Page) =>
	page.evaluate(() => getComputedStyle(document.body).transitionDuration);

/** Perceived brightness of an `rgb(...)` string, for "is it actually dark?". */
function luminance(color: string): number {
	const [r, g, b] = color.match(/\d+/g)!.map(Number);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test.describe('a stored Theme is applied before the first paint', () => {
	test('a dark preference survives a reload without a Flash', async ({
		page,
		seedLocalStorage,
	}) => {
		await seedLocalStorage({ [THEME_STORAGE_KEY]: 'dark' });
		await blockPageScripts(page);

		await page.goto('/');

		expect(await themeOf(page)).toBe('dark');
		expect(await colorSchemeOf(page)).toBe('dark');
	});

	test('a light preference survives a reload without a Flash', async ({
		page,
		seedLocalStorage,
	}) => {
		await seedLocalStorage({ [THEME_STORAGE_KEY]: 'light' });
		await blockPageScripts(page);

		await page.goto('/');

		expect(await themeOf(page)).toBe('light');
		expect(await colorSchemeOf(page)).toBe('light');
	});
});

test.describe('with no stored Theme the OS preference decides', () => {
	test.describe('prefers-color-scheme: dark', () => {
		test.use({ colorScheme: 'dark' });

		test('a first visit is dark before the first paint', async ({ page }) => {
			await blockPageScripts(page);

			await page.goto('/');

			expect(await themeOf(page)).toBe('dark');
			expect(await colorSchemeOf(page)).toBe('dark');
		});
	});

	test.describe('prefers-color-scheme: light', () => {
		test.use({ colorScheme: 'light' });

		test('a first visit is light before the first paint', async ({ page }) => {
			await blockPageScripts(page);

			await page.goto('/');

			expect(await themeOf(page)).toBe('light');
			expect(await colorSchemeOf(page)).toBe('light');
		});
	});
});

test.describe('the Theme drives what is painted, not just the attribute', () => {
	test('dark and light render visibly different, correctly ordered colors', async ({
		page,
	}) => {
		await blockPageScripts(page);
		await page.goto('/');
		const light = await backgroundColorOf(page);

		await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
			THEME_STORAGE_KEY,
			'dark',
		] as const);
		await page.reload();
		const dark = await backgroundColorOf(page);

		expect(dark).not.toBe(light);
		expect(luminance(dark)).toBeLessThan(luminance(light));
	});
});

test.describe('color transitions are gated until the Theme is settled', () => {
	test('the first paint does not animate color', async ({ page }) => {
		await blockPageScripts(page);

		await page.goto('/');

		// `.theme-ready` is added by a bundled script, so blocking scripts leaves
		// the page in its pre-ready state: nothing may animate.
		expect(await transitionDurationOf(page)).toBe('0s');
	});

	test('after load, color transitions are enabled', async ({ page }) => {
		await page.goto('/');

		expect(await transitionDurationOf(page)).not.toBe('0s');
	});
});

test.describe('the ThemeToggle', () => {
	test('persists the Theme across reload and client-side navigation', async ({
		page,
	}) => {
		await page.goto('/');
		expect(await themeOf(page)).toBe('light');

		await page.getByRole('button', { name: /dark theme/i }).click();
		expect(await themeOf(page)).toBe('dark');
		expect(
			await page.evaluate(key => localStorage.getItem(key), THEME_STORAGE_KEY)
		).toBe('dark');

		await page.reload();
		expect(await themeOf(page)).toBe('dark');

		await page.locator('header nav a[href$="/arts"]').first().click();
		await page.waitForURL('**/arts');
		expect(await themeOf(page)).toBe('dark');
	});
});
