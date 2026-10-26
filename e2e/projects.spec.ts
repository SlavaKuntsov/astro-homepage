import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The `projects` collection and its index/detail pages (ticket #9, ADR-0004).
 * This is the rendered-page seam, so it asserts what a visitor sees: an index
 * that leads with featured Projects and links to every detail page, a detail
 * page with its description, markdown body, gallery, and links, and the two
 * Locales pairing the same slugs.
 *
 * The MDX-free markdown body, the schemas, the featured-first ordering, and the
 * GitHub Enrichment merge are pinned by unit tests (`src/lib/projects.test.ts`,
 * `src/lib/enrichment.test.ts`). Enrichment hits the live GitHub API at build
 * time, so here it is asserted only when it was reached, and the page must
 * render either way (failure degrades gracefully).
 */

const cards = (page: Page) => page.locator('[data-project]');

const slugsOf = (page: Page) =>
	cards(page).evaluateAll(nodes =>
		nodes.map(node => node.getAttribute('data-slug') ?? '')
	);

test.describe('the RU projects index at /projects', () => {
	test('renders an H1 and one card per project', async ({ page }) => {
		const response = await page.goto('/projects');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Проекты' })
		).toBeVisible();

		const all = cards(page);
		expect(await all.count()).toBeGreaterThanOrEqual(1);

		for (const card of await all.all()) {
			await expect(card.getByRole('heading', { level: 2 })).not.toBeEmpty();
			await expect(card.locator('p').first()).not.toBeEmpty();
			await expect(card.locator('li').first()).not.toBeEmpty();
		}
	});

	test('leads with featured projects, then follows the manifest', async ({
		page,
	}) => {
		await page.goto('/projects');

		const featured = await cards(page).evaluateAll(nodes =>
			nodes.map(node => node.getAttribute('data-featured') === 'true')
		);

		// Featured Projects come first; once a non-featured card appears, no
		// featured card may follow it. (All-featured is a valid ordering too.)
		expect(featured).toContain(true);
		const firstPlain = featured.indexOf(false);
		if (firstPlain !== -1) {
			expect(featured.slice(firstPlain).some(Boolean)).toBe(false);
		}
	});

	test('links every card to its detail page', async ({ page }) => {
		await page.goto('/projects');

		for (const slug of await slugsOf(page)) {
			await expect(
				page
					.locator(`[data-project][data-slug="${slug}"]`)
					.getByRole('link', { name: 'Смотреть проект' })
			).toHaveAttribute('href', `/projects/${slug}`);
		}
	});

	test('shows the stack of every project', async ({ page }) => {
		await page.goto('/projects');

		for (const card of await cards(page).all()) {
			await expect(card.getByRole('list', { name: 'Стек' })).toBeVisible();
		}
	});
});

test.describe('the EN projects index at /en/projects', () => {
	test('renders the English heading and labels', async ({ page }) => {
		const response = await page.goto('/en/projects');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Projects' })
		).toBeVisible();
		await expect(
			page.locator('[data-project]').first().getByRole('link', {
				name: 'View project',
			})
		).toBeVisible();
	});
});

test('both Locales pair the same project slugs', async ({ page }) => {
	await page.goto('/projects');
	const ru = await slugsOf(page);

	await page.goto('/en/projects');
	const en = await slugsOf(page);

	expect(ru.length).toBeGreaterThanOrEqual(1);
	expect(new Set(en)).toEqual(new Set(ru));
});

test.describe('a project detail page', () => {
	test('shows the title, summary, markdown body, gallery, and links', async ({
		page,
	}) => {
		const response = await page.goto('/projects/astro-homepage');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Сайт-портфолио' })
		).toBeVisible();

		const detail = page.locator('[data-project-detail]');
		await expect(detail).toHaveAttribute('data-slug', 'astro-homepage');

		// The rendered description is the manual `summary` (the merge keeps it
		// over anything GitHub reports), so it is deterministic offline.
		await expect(detail.locator('header p').first()).toHaveText(
			'Портфолио и резюме на Astro, где тема и язык верны с первого кадра.'
		);

		// The long-form markdown body (ADR-0004), not just the frontmatter.
		await expect(detail.locator('[data-project-body] p').first()).not.toBeEmpty();

		const gallery = detail.locator('[data-project-gallery]');
		await expect(gallery).toBeVisible();
		expect(await gallery.locator('img').count()).toBeGreaterThanOrEqual(1);

		await expect(
			detail.locator(
				'[data-project-links] a[href="https://github.com/SlavaKuntsov/astro-homepage"]'
			)
		).toBeVisible();
		await expect(
			detail.locator(
				'[data-project-links] a[href="https://slava-homepage.vercel.app"]'
			)
		).toBeVisible();
	});

	test('links back to the index', async ({ page }) => {
		await page.goto('/projects/astro-homepage');

		await expect(
			page.getByRole('link', { name: /Все проекты/ })
		).toHaveAttribute('href', '/projects');
	});

	test('renders a private project without repository enrichment', async ({
		page,
	}) => {
		const response = await page.goto('/projects/private-crm');
		expect(response?.status()).toBe(200);

		const detail = page.locator('[data-project-detail]');
		await expect(detail).toHaveAttribute('data-visibility', 'private');
		await expect(detail.locator('[data-project-body] p').first()).not.toBeEmpty();
		await expect(detail.locator('[data-project-enrichment]')).toHaveCount(0);
	});

	// Enrichment is optional and hits the real GitHub API at build. When it was
	// reached the block must be well formed; when it failed the page must still
	// render — the acceptance criterion is "degrade gracefully, never fail".
	test('shows GitHub metadata when reached, and renders when it was not', async ({
		page,
	}) => {
		const response = await page.goto('/projects/astro-homepage');
		expect(response?.status()).toBe(200);

		const enrichment = page.locator('[data-project-enrichment]');
		if ((await enrichment.count()) > 0) {
			await expect(page.locator('[data-project-stars]')).toContainText(/\d/);
			await expect(page.locator('[data-project-language]')).not.toBeEmpty();
		}
	});
});

test('the Locale switcher keeps the visitor on a project detail page', async ({
	page,
}) => {
	await page.goto('/projects/astro-homepage');

	const switcher = page.locator('[data-locale-switcher]').first();
	await expect(switcher).toHaveAttribute(
		'href',
		'/en/projects/astro-homepage'
	);

	await switcher.click();
	await page.waitForURL(
		url => url.pathname.replace(/\/+$/, '') === '/en/projects/astro-homepage'
	);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(
		page.getByRole('heading', { level: 1, name: 'Portfolio Site' })
	).toBeVisible();
});

test.describe('the projects page is discoverable', () => {
	test('the nav links to /projects and marks it current', async ({ page }) => {
		await page.goto('/');

		const link = page.locator('header nav a[href="/projects"]').first();
		await expect(link).toBeVisible();
		await expect(link).not.toHaveAttribute('aria-current', 'page');

		await page.goto('/projects');
		await expect(link).toHaveAttribute('aria-current', 'page');
	});

	test('the retired /works route redirects to /projects', async ({ page }) => {
		await page.goto('/works');
		await page.waitForURL(
			url => url.pathname.replace(/\/+$/, '') === '/projects'
		);
	});
});
