import { expect, test } from './fixtures';

test('the Site renders its default (EN) root route', async ({ page }) => {
	const response = await page.goto('/');

	expect(response?.status()).toBe(200);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(
		page.getByRole('heading', { level: 1, name: 'Sviataslau Kuntsou' })
	).toBeVisible();
});

test('the RU root route renders in Russian', async ({ page }) => {
	const response = await page.goto('/ru/');

	expect(response?.status()).toBe(200);
	await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
	await expect(
		page.getByRole('heading', { level: 1, name: 'Кунцов Святослав' })
	).toBeVisible();
});

test('localStorage can be seeded before the first paint', async ({
	page,
	seedLocalStorage,
}) => {
	await seedLocalStorage({ theme: 'dark' });
	await page.goto('/');

	const stored = await page.evaluate(() =>
		window.localStorage.getItem('theme')
	);
	expect(stored).toBe('dark');
});

// The other half of the theme contract (ADR-0003): on a first visit the theme
// falls back to the OS preference, which Playwright emulates per suite.
test.describe('prefers-color-scheme', () => {
	test.use({ colorScheme: 'dark' });

	test('is emulated for the page', async ({ page }) => {
		await page.goto('/');

		const prefersDark = await page.evaluate(
			() => window.matchMedia('(prefers-color-scheme: dark)').matches
		);
		expect(prefersDark).toBe(true);
	});
});
