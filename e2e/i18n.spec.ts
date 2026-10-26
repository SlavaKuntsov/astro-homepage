import { expect, test } from './fixtures';

/**
 * Locale routing and the server-rendered switcher (ticket #6, ADR-0005): RU is
 * the default Locale at the unprefixed root, EN lives under `/en/…`. The
 * switcher is a plain link, so it maps the current path onto the other Locale
 * without any client JavaScript — the one rule lives in `src/lib/i18n.ts`.
 */

const pathnameIs = (expected: string) => (url: URL) => {
	const path = url.pathname.replace(/\/+$/, '') || '/';
	return path === expected;
};

test.describe('each route renders in its Locale', () => {
	test('/ is Russian', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
		await expect(
			page.getByRole('heading', { level: 1, name: 'Кунцов Святослав' })
		).toBeVisible();
		await expect(page.getByRole('navigation').first()).toContainText('Главная');
	});

	test('/en/ is English', async ({ page }) => {
		await page.goto('/en/');

		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await expect(
			page.getByRole('heading', { level: 1, name: 'Sviataslau Kuntsou' })
		).toBeVisible();
		await expect(page.getByRole('navigation').first()).toContainText('Home');
	});
});

test.describe('the Locale switcher is a server-rendered link', () => {
	test('RU points to the same path in EN', async ({ page }) => {
		await page.goto('/');

		const switcher = page.locator('[data-locale-switcher]').first();
		await expect(switcher).toHaveAttribute('href', '/en');
		await expect(switcher).toHaveAttribute('hreflang', 'en');
		await expect(switcher).toHaveAttribute('lang', 'en');
		await expect(switcher).toHaveAttribute(
			'aria-label',
			'Переключить на английский'
		);
	});

	test('EN points to the same path in RU', async ({ page }) => {
		await page.goto('/en/');

		const switcher = page.locator('[data-locale-switcher]').first();
		await expect(switcher).toHaveAttribute('href', '/');
		await expect(switcher).toHaveAttribute('hreflang', 'ru');
		await expect(switcher).toHaveAttribute('lang', 'ru');
		await expect(switcher).toHaveAttribute('aria-label', 'Switch to Russian');
	});

	test('keeps the current path across the round trip', async ({ page }) => {
		await page.goto('/arts');

		await page.locator('[data-locale-switcher]').first().click();
		await page.waitForURL(pathnameIs('/en/arts'));
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');

		await page.locator('[data-locale-switcher]').first().click();
		await page.waitForURL(pathnameIs('/arts'));
		await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
	});

	test('re-derives its target after a same-Locale client navigation', async ({
		page,
	}) => {
		await page.goto('/');

		// A same-Locale navigation persists the header, so its server-rendered
		// href would otherwise still point at the previous page.
		await page.locator('header nav a[href="/projects"]').first().click();
		await page.waitForURL(pathnameIs('/projects'));

		await expect(
			page.locator('[data-locale-switcher]').first()
		).toHaveAttribute('href', '/en/projects');
	});
});

test.describe('the Locale switcher works without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('navigates between Locales as a plain link', async ({ page }) => {
		await page.goto('/arts');

		await page.locator('[data-locale-switcher]').first().click();
		await page.waitForURL(pathnameIs('/en/arts'));

		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await expect(
			page.getByRole('heading', { level: 1, name: 'Arts' })
		).toBeVisible();
	});
});

test.describe('legacy /ru/* routes redirect to the unprefixed routes', () => {
	for (const [legacy, target] of [
		['/ru', '/'],
		['/ru/works', '/projects'],
		['/ru/arts', '/arts'],
	]) {
		test(`${legacy} redirects to ${target}`, async ({ page }) => {
			await page.goto(legacy);
			await page.waitForURL(pathnameIs(target));

			await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
		});
	}
});
