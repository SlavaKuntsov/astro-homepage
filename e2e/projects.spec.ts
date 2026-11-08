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

test.describe('the RU projects index at /ru/projects', () => {
	test('renders an H1 and one card per project', async ({ page }) => {
		const response = await page.goto('/ru/projects');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Проекты' })
		).toBeVisible();

		const all = cards(page);
		expect(await all.count()).toBeGreaterThanOrEqual(1);

		// Every card always carries its title and the "View project" affordance.
		// Its description and tags may come from live Enrichment, which is
		// optional, so they are asserted only when the build reached GitHub.
		for (const card of await all.all()) {
			await expect(card.getByRole('heading', { level: 2 })).not.toBeEmpty();
			await expect(card.getByText('Смотреть проект')).toBeVisible();
		}
	});

	test('leads with featured projects, then follows the manifest', async ({
		page,
	}) => {
		await page.goto('/ru/projects');

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
		await page.goto('/ru/projects');

		for (const slug of await slugsOf(page)) {
			// The whole card is one link; its accessible name is the title.
			const link = page
				.locator(`[data-project][data-slug="${slug}"]`)
				.getByRole('link');
			await expect(link).toHaveAttribute('href', `/ru/projects/${slug}`);
			await expect(link).not.toBeEmpty();
		}
	});

	test('opens the project when the card itself is clicked', async ({ page }) => {
		await page.goto('/ru/projects');

		const card = cards(page).first();
		const slug = await card.getAttribute('data-slug');

		// The whole card is one link, so clicking the title opens the Project
		// (a description may be absent when Enrichment was not reached).
		await card.getByRole('heading', { level: 2 }).click();

		await page.waitForURL(
			url => url.pathname.replace(/\/+$/, '') === `/ru/projects/${slug}`
		);
		await expect(page.locator('[data-project-detail]')).toHaveAttribute(
			'data-slug',
			slug ?? ''
		);
	});

	// Tags are the repo's topics, else the manual `stack`. Both can come from
	// live Enrichment, so a build that did not reach GitHub may show none; when
	// a card does render tags they must be a non-empty list.
	test('shows tags when the repo or stack provides them', async ({ page }) => {
		await page.goto('/ru/projects');

		for (const card of await cards(page).all()) {
			const tags = card.getByRole('list', { name: 'Теги' });
			if ((await tags.count()) === 0) continue;

			await expect(tags).toBeVisible();
			expect(await tags.locator('li').count()).toBeGreaterThan(0);
		}
	});
});

test.describe('the EN projects index at /projects', () => {
	test('renders the English heading and labels', async ({ page }) => {
		const response = await page.goto('/projects');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Projects' })
		).toBeVisible();
		await expect(
			page.locator('[data-project]').first().getByText('View project')
		).toBeVisible();
	});
});

test('both Locales pair the same project slugs', async ({ page }) => {
	await page.goto('/ru/projects');
	const ru = await slugsOf(page);

	await page.goto('/projects');
	const en = await slugsOf(page);

	expect(ru.length).toBeGreaterThanOrEqual(1);
	expect(new Set(en)).toEqual(new Set(ru));
});

test.describe('a project detail page', () => {
	test('shows the title, markdown body, gallery, and links', async ({
		page,
	}) => {
		const response = await page.goto('/ru/projects/astro-homepage');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Сайт-портфолио' })
		).toBeVisible();

		const detail = page.locator('[data-project-detail]');
		await expect(detail).toHaveAttribute('data-slug', 'astro-homepage');

		// The header description and tags can come from live Enrichment (this
		// Project authors neither a summary nor a stack), so a build that did not
		// reach GitHub simply omits them. Which source wins is pinned by the merge
		// unit tests (`src/lib/enrichment.test.ts`); here we only guard presence.
		const description = detail.locator('header p').first();
		if ((await description.count()) > 0) {
			await expect(description).not.toBeEmpty();
		}
		const tags = detail.getByRole('list', { name: 'Теги' });
		if ((await tags.count()) > 0) {
			await expect(tags).toBeVisible();
		}

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
		await page.goto('/ru/projects/astro-homepage');

		await expect(
			page.getByRole('link', { name: /Все проекты/ })
		).toHaveAttribute('href', '/ru/projects');
	});

	// Enrichment is optional and hits the real GitHub API at build. When it was
	// reached the language breakdown must be well formed; when it failed the page
	// must still render — the acceptance criterion is "degrade gracefully, never
	// fail".
	test('shows the GitHub language breakdown when reached, and renders when it was not', async ({
		page,
	}) => {
		const response = await page.goto('/ru/projects/astro-homepage');
		expect(response?.status()).toBe(200);

		const breakdown = page.locator('[data-project-languages]');
		if ((await breakdown.count()) > 0) {
			const rows = breakdown.locator('[data-project-language]');
			expect(await rows.count()).toBeGreaterThanOrEqual(1);
			await expect(rows.first()).toContainText(/\d+(\.\d+)?%/);
		}
	});
});

// The published toggle (ticket #53): `private-crm` keeps its content in the
// repo but is authored `published: false`, so it leaves both indexes and its
// detail route is not generated in either Locale.
test.describe('the published toggle', () => {
	test('an unpublished Project is absent from both indexes', async ({ page }) => {
		for (const path of ['/projects', '/ru/projects']) {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);

			await expect(
				page.locator('[data-project][data-slug="private-crm"]')
			).toHaveCount(0);
		}
	});

	test('an unpublished Project has no detail route in either Locale', async ({
		page,
	}) => {
		for (const path of ['/projects/private-crm', '/ru/projects/private-crm']) {
			const response = await page.goto(path);
			expect(response?.status()).toBe(404);
		}
	});
});

test('the Locale switcher keeps the visitor on a project detail page', async ({
	page,
}) => {
	await page.goto('/ru/projects/astro-homepage');

	const switcher = page.locator('[data-locale-switcher]').first();
	await expect(switcher).toHaveAttribute(
		'href',
		'/projects/astro-homepage'
	);

	await switcher.click();
	await page.waitForURL(
		url => url.pathname.replace(/\/+$/, '') === '/projects/astro-homepage'
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
