import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The home page composition (ticket #12): the Site's CV assembled from the
 * content collections. This is the rendered-page seam, so it asserts what a
 * recruiter sees — the hero (name, position, one-line pitch, avatar) above the
 * fold, the resume sections, the featured-Projects and Arts previews (both
 * collection-driven, never hardcoded) with links to their full pages, and the
 * arts preview's controls actually painted above the edge fades and operable.
 *
 * The no-Flash half of the contract lives in `theme.spec.ts` (theme, on `/`)
 * and `smoke.spec.ts` (Locale); this file only re-asserts that the preview is
 * server-rendered, so the Locale and the Artworks are right with no JavaScript.
 */

const LOCALES = [
	{
		path: '/',
		name: 'Кунцов Святослав',
		position: 'Разработчик программного обеспечения',
		artsHeading: 'Картиночки',
		artsViewAll: 'Все работы',
		featuredHeading: 'Избранные проекты',
		projectsViewAll: 'Все проекты',
		experienceViewAll: 'Весь опыт',
		previous: 'Предыдущая работа',
		next: 'Следующая работа',
	},
	{
		path: '/en/',
		name: 'Sviataslau Kuntsou',
		position: 'Software Developer',
		artsHeading: 'Arts',
		artsViewAll: 'All artworks',
		featuredHeading: 'Featured projects',
		projectsViewAll: 'All projects',
		experienceViewAll: 'View full experience',
		previous: 'Previous artwork',
		next: 'Next artwork',
	},
] as const;

const featured = (page: Page) => page.locator('[data-featured-projects]');
const artworkPreview = (page: Page) => page.locator('[data-arts-preview]');
const rail = (page: Page) =>
	page.locator('[data-arts-preview] [data-arts-rail]');
const previousControl = (page: Page) => page.locator('[data-arts-previous]');
const nextControl = (page: Page) => page.locator('[data-arts-next]');

/** Whether an element's whole box is inside the first screen. */
const isAboveTheFold = async (page: Page, selector: string) => {
	const box = await page.locator(selector).boundingBox();
	const viewport = page.viewportSize();
	if (!box || !viewport) return false;

	return box.y >= 0 && box.y + box.height <= viewport.height;
};

/**
 * The regression this ticket rebuilds away from: an opaque edge fade painted
 * over a control. If either fade's box overlaps either control's box, the fade
 * can paint the control away. The rebuilt preview keeps them apart, so no fade
 * can ever cover a control — in either Theme or Locale.
 */
const controlsClearOfFades = (page: Page) =>
	page.evaluate(() => {
		const fades = [
			...document.querySelectorAll<HTMLElement>('[data-edge-fade]'),
		];
		const controls = [
			...document.querySelectorAll<HTMLElement>(
				'[data-arts-previous], [data-arts-next]'
			),
		];
		if (fades.length === 0 || controls.length === 0) return false;

		const intersects = (a: DOMRect, b: DOMRect) =>
			a.left < b.right &&
			a.right > b.left &&
			a.top < b.bottom &&
			a.bottom > b.top;

		return controls.every(control =>
			fades.every(
				fade =>
					!intersects(
						control.getBoundingClientRect(),
						fade.getBoundingClientRect()
					)
			)
		);
	});

test.describe('the hero is above the fold', () => {
	for (const { path, name, position } of LOCALES) {
		test(`${path} shows the name, position, pitch, and avatar first`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.goto(path);

			await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
			await expect(page.locator('[data-hero-pitch]')).not.toBeEmpty();
			await expect(page.locator('[data-hero-position]')).toHaveText(position);
			await expect(page.locator('[data-avatar]')).toBeVisible();

			for (const selector of [
				'h1',
				'[data-hero-pitch]',
				'[data-hero-position]',
				'[data-avatar]',
			]) {
				expect(await isAboveTheFold(page, selector)).toBe(true);
			}
		});
	}
});

test.describe('the featured projects', () => {
	test('come from the collection and link to the index and each Project', async ({
		page,
	}) => {
		await page.goto('/');

		const section = featured(page);
		await expect(section).toBeVisible();
		await expect(
			section.getByRole('heading', { level: 2, name: 'Избранные проекты' })
		).toBeVisible();

		// Only the Projects marked `featured`, in index order (ADR-0009).
		const slugs = await section
			.locator('[data-project]')
			.evaluateAll(nodes =>
				nodes.map(node => node.getAttribute('data-slug') ?? '')
			);
		expect(slugs).toEqual(['astro-homepage', 'flowix']);

		for (const slug of slugs) {
			await expect(
				section.locator(`[data-project][data-slug="${slug}"]`).getByRole('link')
			).toHaveAttribute('href', `/projects/${slug}`);
		}

		await expect(
			section.getByRole('link', { name: 'Все проекты' })
		).toHaveAttribute('href', '/projects');
	});

	test('are localized on /en/', async ({ page }) => {
		await page.goto('/en/');

		const section = featured(page);
		await expect(
			section.getByRole('heading', { level: 2, name: 'Featured projects' })
		).toBeVisible();
		await expect(
			section.getByRole('link', { name: 'All projects' })
		).toHaveAttribute('href', '/en/projects');
		await expect(
			section.locator('[data-project][data-slug="flowix"]').getByRole('link')
		).toHaveAttribute('href', '/en/projects/flowix');
	});
});

test.describe('the arts preview', () => {
	test('previews the collection and links to the full gallery', async ({
		page,
	}) => {
		await page.goto('/');

		const section = artworkPreview(page);
		await expect(section).toBeVisible();
		await expect(
			section.getByRole('heading', { level: 2, name: 'Картиночки' })
		).toBeVisible();

		// The same Artworks, in the same order, as the full gallery — so the
		// preview cannot drift from the `arts` collection. It may be a leading
		// slice of the gallery, but never a reordered or hardcoded one.
		const preview = await section
			.locator('[data-art]')
			.evaluateAll(nodes =>
				nodes.map(node => node.getAttribute('data-slug') ?? '')
			);

		await page.goto('/arts');
		const full = await page
			.locator('[data-art]')
			.evaluateAll(nodes =>
				nodes.map(node => node.getAttribute('data-slug') ?? '')
			);

		expect(preview.length).toBeGreaterThan(1);
		expect(full.slice(0, preview.length)).toEqual(preview);

		await page.goto('/');
		await expect(
			page
				.locator('[data-arts-preview]')
				.getByRole('link', { name: 'Все работы' })
		).toHaveAttribute('href', '/arts');
	});

	test('is localized on /en/', async ({ page }) => {
		await page.goto('/en/');

		await expect(
			artworkPreview(page).getByRole('heading', {
				level: 2,
				name: 'Arts',
			})
		).toBeVisible();
		await expect(
			artworkPreview(page).getByRole('link', { name: 'All artworks' })
		).toHaveAttribute('href', '/en/arts');
	});

	test('opens a previewed Artwork in the shared lightbox', async ({ page }) => {
		await page.goto('/');

		await artworkPreview(page).locator('[data-art-open]').first().click();

		await expect(page.locator('[data-arts-lightbox]')).toHaveJSProperty(
			'open',
			true
		);
	});
});

test.describe('the arts preview controls', () => {
	for (const { path, previous, next } of LOCALES) {
		for (const theme of ['light', 'dark'] as const) {
			test(`are visible, clear of the fades, and step the rail (${path}, ${theme})`, async ({
				page,
				seedLocalStorage,
			}) => {
				await seedLocalStorage({ theme });
				await page.goto(path);
				await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

				await expect(previousControl(page)).toBeVisible();
				await expect(nextControl(page)).toBeVisible();
				await expect(previousControl(page)).toHaveAttribute(
					'aria-label',
					previous
				);
				await expect(nextControl(page)).toHaveAttribute('aria-label', next);

				expect(await controlsClearOfFades(page)).toBe(true);

				// A control that is not operable (occluded or inert) leaves the
				// rail where it is; a working one steps it.
				await expect
					.poll(() => rail(page).evaluate(el => el.scrollLeft))
					.toBe(0);
				await nextControl(page).click();
				await expect
					.poll(() => rail(page).evaluate(el => el.scrollLeft))
					.toBeGreaterThan(0);

				await previousControl(page).click();
				await expect
					.poll(() => rail(page).evaluate(el => el.scrollLeft))
					.toBe(0);
			});
		}
	}
});

test('the edge fades follow the overflowing side', async ({ page }) => {
	await page.goto('/');

	const left = page.locator('[data-arts-fade="left"]');
	const right = page.locator('[data-arts-fade="right"]');

	// At the start there is nothing to fade on the left; the right overflows.
	await expect(left).toHaveAttribute('data-active', 'false');
	await expect(right).toHaveAttribute('data-active', 'true');

	await rail(page).evaluate(el => el.scrollTo({ left: el.scrollWidth }));

	await expect(left).toHaveAttribute('data-active', 'true');
	await expect(right).toHaveAttribute('data-active', 'false');
});

test('the home page links to the full experience, projects, and arts pages', async ({
	page,
}) => {
	await page.goto('/');

	await expect(
		page
			.locator('[data-experience-highlights]')
			.getByRole('link', { name: 'Весь опыт' })
	).toHaveAttribute('href', '/experience');
	await expect(
		featured(page).getByRole('link', { name: 'Все проекты' })
	).toHaveAttribute('href', '/projects');
	await expect(
		artworkPreview(page).getByRole('link', { name: 'Все работы' })
	).toHaveAttribute('href', '/arts');
});

test.describe('the home page without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('server-renders the preview in the right Locale', async ({ page }) => {
		await page.goto('/');

		// The Locale is resolved on the server, not after hydration.
		await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
		expect(
			await artworkPreview(page).locator('[data-art]').count()
		).toBeGreaterThanOrEqual(1);
		await expect(nextControl(page)).toBeVisible();
	});
});
