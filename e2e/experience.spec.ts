import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The `experience` collection and its timeline (ticket #7, ADR-0004). This is
 * the rendered-page seam, so it asserts structure and ordering rather than the
 * placeholder content the content-migration ticket (#14) replaces:
 *
 * - `/experience` and `/en/experience` render a timeline from the collection;
 * - entries are newest-first, every entry shows its role, period, and stack;
 * - both Locales pair the same slugs.
 *
 * The schema half of the contract lives in `src/lib/experience.test.ts`.
 */

const entries = (page: Page) => page.locator('[data-experience-entry]');

const slugsOf = (page: Page) =>
	entries(page).evaluateAll(nodes =>
		nodes.map(node => node.getAttribute('data-slug') ?? '')
	);

/** Each entry's start date, read from its first `<time>`. */
const startDates = (page: Page) =>
	entries(page).evaluateAll(nodes =>
		nodes.map(
			node => node.querySelector('time')?.getAttribute('datetime') ?? ''
		)
	);

test.describe('the RU timeline at /experience', () => {
	test('renders an H1 and one role per entry', async ({ page }) => {
		const response = await page.goto('/experience');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Опыт работы' })
		).toBeVisible();

		const timeline = entries(page);
		expect(await timeline.count()).toBeGreaterThanOrEqual(1);

		for (const entry of await timeline.all()) {
			await expect(entry.getByRole('heading', { level: 3 })).toBeVisible();
			await expect(entry.locator('time').first()).toHaveAttribute(
				'datetime',
				/^\d{4}-\d{2}$/
			);
			await expect(entry.locator('article p').first()).not.toBeEmpty();
		}
	});

	test('orders entries newest-first', async ({ page }) => {
		await page.goto('/experience');

		const dates = await startDates(page);
		expect(dates.length).toBeGreaterThanOrEqual(2);

		const newestFirst = [...dates].sort((a, b) => b.localeCompare(a));
		expect(dates).toEqual(newestFirst);
	});

	test('renders the environment of each entry', async ({ page }) => {
		await page.goto('/experience');

		await expect(
			page.getByRole('list', { name: 'Окружение' }).first()
		).toBeVisible();
	});

	test('links the company when a company URL is present', async ({ page }) => {
		await page.goto('/experience');

		const linked = await entries(page).evaluateAll(nodes =>
			nodes
				.map(node => ({
					url: node.getAttribute('data-company-url'),
					href: node.querySelector('a[target="_blank"]')?.getAttribute('href'),
				}))
				.filter(node => node.url)
		);

		for (const { url, href } of linked) {
			expect(href).toBe(url);
		}
	});
});

test.describe('the EN timeline at /en/experience', () => {
	test('renders the English heading and environment label', async ({
		page,
	}) => {
		const response = await page.goto('/en/experience');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Experience' })
		).toBeVisible();
		await expect(
			page.getByRole('list', { name: 'Environment' }).first()
		).toBeVisible();
	});
});

test('both Locales pair the same slugs', async ({ page }) => {
	await page.goto('/experience');
	const ru = await slugsOf(page);

	await page.goto('/en/experience');
	const en = await slugsOf(page);

	expect(ru.length).toBeGreaterThanOrEqual(1);
	expect(new Set(en)).toEqual(new Set(ru));
});

test('the Locale switcher keeps the visitor on the experience page', async ({
	page,
}) => {
	await page.goto('/experience');

	const switcher = page.locator('[data-locale-switcher]').first();
	await expect(switcher).toHaveAttribute('href', '/en/experience');

	await switcher.click();
	await page.waitForURL(
		url => url.pathname.replace(/\/+$/, '') === '/en/experience'
	);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

// `/experience` must not be an orphan: it is linked from the nav on every page
// and previewed by the highlights block on the home page.
test.describe('the experience page is discoverable', () => {
	test('the RU home shows the highlights block and links to /experience', async ({
		page,
	}) => {
		await page.goto('/');

		await expect(
			page.locator('header nav a[href="/experience"]').first()
		).toBeVisible();

		const block = page.locator('[data-experience-highlights]');
		await expect(block).toBeVisible();
		expect(
			await page.locator('[data-experience-highlight]').count()
		).toBeGreaterThanOrEqual(1);
		await expect(
			block.getByRole('link', { name: 'Весь опыт' })
		).toHaveAttribute('href', '/experience');
	});

	test('the EN home shows the highlights block and links to /en/experience', async ({
		page,
	}) => {
		await page.goto('/en/');

		await expect(
			page.locator('header nav a[href="/en/experience"]').first()
		).toBeVisible();

		const block = page.locator('[data-experience-highlights]');
		await expect(
			block.getByRole('heading', { name: 'Career highlights' })
		).toBeVisible();
		await expect(
			block.getByRole('link', { name: 'View full experience' })
		).toHaveAttribute('href', '/en/experience');
	});

	test('the nav marks /experience as the current page', async ({ page }) => {
		await page.goto('/experience');

		await expect(
			page.locator('header nav a[href="/experience"]').first()
		).toHaveAttribute('aria-current', 'page');
	});
});
