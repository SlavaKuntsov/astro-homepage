import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import {
	publishedSlugs,
	repoSlugs,
	sharedFor,
	unpublishedSlugs,
} from './project-data';

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

	test('opens the project when the card itself is clicked', async ({
		page,
	}) => {
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
			// The chip list is always in the DOM; its items are what may be absent.
			const tags = card.getByRole('list', { name: 'Теги' });
			if ((await tags.locator('li').count()) === 0) continue;

			await expect(tags).toBeVisible();
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
	test('opens from the index and shows its title, slug, body, and back link', async ({
		page,
	}) => {
		await page.goto('/ru/projects');

		const card = cards(page).first();
		const slug = (await card.getAttribute('data-slug')) ?? '';
		const title = (
			await card.getByRole('heading', { level: 2 }).innerText()
		).trim();

		await card.getByRole('heading', { level: 2 }).click();
		await page.waitForURL(
			url => url.pathname.replace(/\/+$/, '') === `/ru/projects/${slug}`
		);

		const detail = page.locator('[data-project-detail]');
		await expect(detail).toHaveAttribute('data-slug', slug);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);

		// The long-form markdown body (ADR-0004), not just the frontmatter.
		await expect(detail.locator('[data-project-body]')).toBeVisible();

		await expect(
			page.getByRole('link', { name: /Все проекты/ })
		).toHaveAttribute('href', '/ru/projects');

		// The header description and tags can come from live Enrichment, so a
		// build that did not reach GitHub simply omits them; assert them only
		// when present. Which source wins is pinned by the merge unit tests.
		const description = detail.locator('header p').first();
		if ((await description.count()) > 0) {
			await expect(description).not.toBeEmpty();
		}
		const tags = detail.getByRole('list', { name: 'Теги' });
		if ((await tags.locator('li').count()) > 0) {
			await expect(tags).toBeVisible();
		}
	});

	// The gallery and links are authored per Project, so the scenario picks one
	// from `shared.json` and compares the rendered page to its record.
	test('renders the authored images and links', async ({ page }) => {
		const slug =
			publishedSlugs.find(
				candidate => sharedFor(candidate).links !== undefined
			) ?? publishedSlugs[0];
		test.skip(slug === undefined, 'the index lists no Projects');
		if (slug === undefined) return;

		const response = await page.goto(`/ru/projects/${slug}`);
		expect(response?.status()).toBe(200);

		const data = sharedFor(slug);
		const detail = page.locator('[data-project-detail]');
		const gallery = detail.locator('[data-project-gallery]');
		const images = data.images?.length
			? data.images
			: data.cover
				? [data.cover]
				: [];

		if (images.length === 0) {
			await expect(gallery).toHaveCount(0);
		} else {
			await expect(gallery).toBeVisible();
			await expect(gallery.locator('img')).toHaveCount(images.length);
			for (const image of images) {
				await expect(gallery.locator(`img[src="${image}"]`)).toHaveCount(1);
			}
		}

		for (const href of Object.values(data.links ?? {}).filter(
			(value): value is string => value !== undefined
		)) {
			await expect(
				detail.locator(`[data-project-links] a[href="${href}"]`)
			).toBeVisible();
		}
	});

	// Enrichment is optional and hits the real GitHub API at build. When it was
	// reached the language breakdown must be well formed; when it failed the page
	// must still render — the acceptance criterion is "degrade gracefully, never
	// fail".
	test('shows the GitHub language breakdown when reached, and renders when it was not', async ({
		page,
	}) => {
		const slug = repoSlugs[0] ?? publishedSlugs[0];
		test.skip(slug === undefined, 'the index lists no Projects');
		if (slug === undefined) return;

		const response = await page.goto(`/ru/projects/${slug}`);
		expect(response?.status()).toBe(200);

		const breakdown = page.locator('[data-project-languages]');
		if ((await breakdown.count()) > 0) {
			const rows = breakdown.locator('[data-project-language]');
			expect(await rows.count()).toBeGreaterThanOrEqual(1);
			await expect(rows.first()).toContainText(/\d+(\.\d+)?%/);
		}
	});
});

// The published toggle (ticket #53): a Project authored `published: false`
// keeps its content in the repo but leaves both indexes, and its detail route
// is not generated in either Locale. The scenarios come from `shared.json`, so
// hiding or re-publishing a Project needs no edit here.
test.describe('the published toggle', () => {
	for (const slug of unpublishedSlugs) {
		test(`${slug} is absent from both indexes`, async ({ page }) => {
			for (const path of ['/projects', '/ru/projects']) {
				const response = await page.goto(path);
				expect(response?.status()).toBe(200);

				await expect(
					page.locator(`[data-project][data-slug="${slug}"]`)
				).toHaveCount(0);
			}
		});

		test(`${slug} has no detail route in either Locale`, async ({ page }) => {
			for (const path of [`/projects/${slug}`, `/ru/projects/${slug}`]) {
				const response = await page.goto(path);
				expect(response?.status()).toBe(404);
			}
		});
	}
});

test('the Locale switcher keeps the visitor on a project detail page', async ({
	page,
}) => {
	await page.goto('/projects');

	const slug = await cards(page).first().getAttribute('data-slug');
	test.skip(slug === null, 'the index lists no Projects');
	if (slug === null) return;

	await page.goto(`/ru/projects/${slug}`);

	const switcher = page.locator('[data-locale-switcher]').first();
	await expect(switcher).toHaveAttribute('href', `/projects/${slug}`);

	await switcher.click();
	await page.waitForURL(
		url => url.pathname.replace(/\/+$/, '') === `/projects/${slug}`
	);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('[data-project-detail]')).toHaveAttribute(
		'data-slug',
		slug
	);
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
