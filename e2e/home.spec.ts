import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The home page composition (ticket #12): the Site's CV assembled from the
 * content collections. This is the rendered-page seam, so it asserts what a
 * recruiter sees — the hero carousel first, the hero (name, position, one-line
 * pitch, avatar), the resume sections, and the contacts. The carousel is
 * collection-driven (never hardcoded) and its controls are actually painted
 * above the edge fades and operable.
 *
 * The no-Flash half of the contract lives in `theme.spec.ts` (theme, on `/`)
 * and `smoke.spec.ts` (Locale); this file only re-asserts that the carousel is
 * server-rendered, so the Locale and the Artworks are right with no JavaScript.
 */

const LOCALES = [
	{
		path: '/',
		name: 'Кунцов Святослав',
		position: 'Разработчик программного обеспечения',
		experienceViewAll: 'Весь опыт',
		previous: 'Предыдущая работа',
		next: 'Следующая работа',
	},
	{
		path: '/en/',
		name: 'Sviataslau Kuntsou',
		position: 'Software Developer',
		experienceViewAll: 'View full experience',
		previous: 'Previous artwork',
		next: 'Next artwork',
	},
] as const;

const carousel = (page: Page) => page.locator('[data-arts-carousel]');
const track = (page: Page) => page.locator('[data-arts-track]');
const slides = (page: Page) => page.locator('[data-arts-slide]');
const previousControl = (page: Page) =>
	page.locator('[data-arts-carousel-previous]');
const nextControl = (page: Page) => page.locator('[data-arts-carousel-next]');

/** Whether an element's whole box is inside the first screen. */
const isAboveTheFold = async (page: Page, selector: string) => {
	const box = await page.locator(selector).boundingBox();
	const viewport = page.viewportSize();
	if (!box || !viewport) return false;

	return box.y >= 0 && box.y + box.height <= viewport.height;
};

/** The carousel track's current horizontal offset, in pixels. */
const offsetX = (page: Page) =>
	track(page).evaluate(
		el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41
	);

/** The `src` of every matching image, in DOM order. */
const imageSources = (page: Page, selector: string) =>
	page
		.locator(selector)
		.evaluateAll(nodes =>
			nodes.map(node => (node as HTMLImageElement).getAttribute('src') ?? '')
		);

/**
 * Whether a control is the topmost element at its own centre: if a fade (or
 * anything else) were painted over it, `elementFromPoint` would return that
 * element instead. This is the occlusion the old hero carousel suffered, and
 * the rebuilt one must not.
 */
const isTopmost = (page: Page, selector: string) =>
	page.locator(selector).evaluate(el => {
		const rect = el.getBoundingClientRect();
		const top = document.elementFromPoint(
			rect.left + rect.width / 2,
			rect.top + rect.height / 2
		);
		return top === el || el.contains(top);
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

test('the carousel shows the collection’s Artworks in order', async ({
	page,
}) => {
	await page.goto('/');
	await expect(carousel(page)).toBeVisible();

	const shown = await imageSources(page, '[data-arts-slide] img');
	expect(shown.length).toBeGreaterThan(1);

	// The same Artworks, in the same order, as the full gallery — so the
	// carousel cannot drift from the `arts` collection.
	await page.goto('/arts');
	const full = await imageSources(page, '[data-art-thumb]');

	expect(full.slice(0, shown.length)).toEqual(shown);
});

test.describe('the carousel controls', () => {
	for (const { path, previous, next } of LOCALES) {
		for (const theme of ['light', 'dark'] as const) {
			test(`are visible, unoccluded, and step the carousel (${path}, ${theme})`, async ({
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

				// A control that is not operable (occluded or inert) leaves the
				// carousel where it is; a working one steps it.
				expect(await isTopmost(page, '[data-arts-carousel-previous]')).toBe(
					true
				);
				expect(await isTopmost(page, '[data-arts-carousel-next]')).toBe(true);

				await expect.poll(() => offsetX(page)).toBeGreaterThan(-1);
				await nextControl(page).click();
				await expect.poll(() => offsetX(page)).toBeLessThan(-1);

				await previousControl(page).click();
				await expect.poll(() => offsetX(page)).toBeGreaterThan(-1);
			});
		}
	}
});

test('the carousel autoplays through the Artworks', async ({ page }) => {
	await page.goto('/');
	await expect(carousel(page)).toBeVisible();

	// The pointer is at the origin, off the carousel, so autoplay is running;
	// the first step lands well within the 4s beat.
	await expect.poll(() => offsetX(page), { timeout: 8000 }).toBeLessThan(-1);
});

test('the carousel fades its edges without covering a control', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');

	await expect(page.locator('[data-edge-fade]')).toHaveCount(2);
	expect(await isTopmost(page, '[data-arts-carousel-previous]')).toBe(true);
	expect(await isTopmost(page, '[data-arts-carousel-next]')).toBe(true);
});

test('the home page drops the featured-Projects and arts previews', async ({
	page,
}) => {
	await page.goto('/');

	await expect(page.locator('[data-featured-projects]')).toHaveCount(0);
	await expect(page.locator('[data-arts-preview]')).toHaveCount(0);
});

test('the home page links to the full experience page', async ({ page }) => {
	await page.goto('/');

	await expect(
		page
			.locator('[data-experience-highlights]')
			.getByRole('link', { name: 'Весь опыт' })
	).toHaveAttribute('href', '/experience');
});

test.describe('the home page without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('server-renders the carousel in the right Locale', async ({ page }) => {
		await page.goto('/');

		// The Locale is resolved on the server, not after hydration.
		await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
		expect(await slides(page).count()).toBeGreaterThan(1);
		await expect(slides(page).first()).toBeVisible();
		await expect(nextControl(page)).toBeVisible();
	});
});
