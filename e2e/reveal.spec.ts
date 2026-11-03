import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The Site-wide scroll reveal (ticket #28): a container marked `data-reveal`
 * hands its direct children to one shared mechanism that hides only the items
 * below the fold at load and fades them in as they are scrolled to, staggered
 * across the rows the browser actually rendered.
 *
 * The Arts gallery is the surface under test — it is the one page opted in so
 * far, and its grid renders a different number of items per row at different
 * widths, so it exercises the layout-derived stagger directly. The tests
 * observe what a visitor sees — opacity, position, the rendered columns, and
 * the computed transition timing — never the mechanism's private attributes.
 */

const items = (page: Page) => page.locator('[data-art]');

const ROUTES = [
	'/',
	'/projects',
	'/arts',
	'/experience',
	'/ru/',
	'/ru/projects',
	'/ru/arts',
	'/ru/experience',
];

/** Samples each artwork's computed reveal timing, the rendered columns, and the
 * motion tokens. */
const sampleItems = (page: Page) =>
	page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		const grid = document.querySelector<HTMLElement>('[data-reveal]');
		const nodes = Array.from(
			document.querySelectorAll<HTMLElement>('[data-art]')
		);

		return {
			// The browser's resolved grid is the ground truth for how many items a
			// row holds: the layout actually painted, not a number the test assumes.
			columns: grid
				? getComputedStyle(grid)
						.gridTemplateColumns.split(/\s+/)
						.filter(Boolean).length
				: 0,
			stagger: parseFloat(root.getPropertyValue('--motion-reveal-stagger')),
			duration: root.getPropertyValue('--motion-reveal-duration').trim(),
			easing: root.getPropertyValue('--motion-reveal-easing').trim(),
			items: nodes.map(node => {
				const style = getComputedStyle(node);
				return {
					delay: parseFloat(style.transitionDelay) * 1000,
					duration: style.transitionDuration,
					easing: style.transitionTimingFunction,
				};
			}),
		};
	});

/** A CSS time (`500ms`, `0.5s`) as milliseconds, so the token and its computed
 * form can be compared regardless of how the browser normalized them. */
const msOf = (value: string): number => {
	const text = value.trim();
	if (text.endsWith('ms')) return parseFloat(text);
	if (text.endsWith('s')) return parseFloat(text) * 1000;
	return parseFloat(text);
};

test.describe('the reveal leaves on-screen items alone', () => {
	test('paints every item at full strength and final position on the first frame', async ({
		page,
	}) => {
		// The reveal may only hide items below the fold. A container caught
		// mid-reveal while it is on screen is a first-frame bug: it would flash
		// missing content, and on a page too short to scroll it would stay faded.
		for (const height of [400, 1100]) {
			await page.setViewportSize({ width: 1280, height });

			for (const path of ROUTES) {
				await page.goto(path);

				// Asserted without retrying: a faded item must not pass by fading in.
				const faded = await page.evaluate(() =>
					Array.from(document.querySelectorAll('[data-reveal] > *'))
						.filter(
							element =>
								element.getBoundingClientRect().top < window.innerHeight
						)
						.map(element => Number(getComputedStyle(element).opacity))
						.filter(opacity => opacity < 1)
				);
				expect(faded).toEqual([]);
			}
		}
	});

	test('hides only below-the-fold items and reveals them on scroll', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 300 });
		await page.goto('/arts');

		const last = items(page).last();

		// Below the fold, so hidden and lifted until it is scrolled to.
		await expect(last).toHaveCSS('opacity', '0');

		await last.scrollIntoViewIfNeeded();
		await expect(last).toHaveCSS('opacity', '1');

		// The reveal runs once: scrolling back up leaves it revealed.
		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(last).toHaveCSS('opacity', '1');
	});
});

test.describe('the stagger follows the rendered rows', () => {
	// The Arts grid is 2 columns on a phone and 3 on a wide screen — it narrows
	// with the content column. The count itself is read from the rendered layout
	// below, never assumed here, so a change to the grid does not silently make
	// this a test of a hardcoded number.
	for (const width of [375, 800, 1280]) {
		test(`at ${width}px, each item is delayed by its column`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 300 });
			await page.goto('/arts');

			const { items, columns, stagger, duration, easing } =
				await sampleItems(page);

			// The grid resolved to a real multi-column layout, so the oracle below
			// is about the rows the browser actually painted.
			expect(columns).toBeGreaterThan(1);

			// The mechanism schedules the below-the-fold items and gives each a
			// reveal transition; on-screen items are left untouched. That computed
			// transition is the public signal of which items were hidden to fade
			// in — it does not depend on where the fold happened to fall.
			const revealed = items.filter(item => msOf(item.duration) > 0);
			expect(revealed.length).toBeGreaterThan(0);

			for (const item of revealed) {
				// A row-major grid fills left to right, so an item's column is its
				// position in the row: its index modulo the rendered column count.
				// That is an oracle independent of how the mechanism groups rows,
				// so a wrong grouping cannot pass by mirroring the same mistake.
				const column = items.indexOf(item) % columns;
				expect(item.delay).toBeCloseTo(column * stagger, 1);

				// The duration and easing come from the design tokens, not from a
				// per-component value: every value of the transition lists matches.
				for (const value of item.duration.split(',')) {
					expect(msOf(value)).toBeCloseTo(msOf(duration), 1);
				}
				for (const value of item.easing.split(',')) {
					expect(value.trim()).toBe(easing);
				}
			}
		});
	}
});

test.describe('the reveal re-binds after client-side navigation', () => {
	test('the new grid reveals below the fold and stays bound across pages', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 300 });
		await page.goto('/');

		// A client-side navigation replaces the page content, so the mechanism
		// must bind the new grid (and must not double-bind the old one).
		await page.locator('header nav a[href$="/arts"]').first().click();
		await page.waitForURL('**/arts');

		const last = items(page).last();
		await expect(last).toHaveCSS('opacity', '0');

		await last.scrollIntoViewIfNeeded();
		await expect(last).toHaveCSS('opacity', '1');

		// Navigate away and back: the reveal still works, once per page load.
		await page.locator('header nav a[href$="/projects"]').first().click();
		await page.waitForURL('**/projects');
		await page.locator('header nav a[href$="/arts"]').first().click();
		await page.waitForURL('**/arts');

		const again = items(page).last();
		await expect(again).toHaveCSS('opacity', '0');
		await again.scrollIntoViewIfNeeded();
		await expect(again).toHaveCSS('opacity', '1');
	});
});

test.describe('prefers-reduced-motion: reduce', () => {
	test.use({ reducedMotion: 'reduce' });

	test('hides and moves nothing, before or after scrolling', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 300 });
		await page.goto('/arts');

		const disturbed = () =>
			page.evaluate(
				() =>
					Array.from(document.querySelectorAll('[data-art]')).filter(
						element => {
							const style = getComputedStyle(element);
							return (
								Number(style.opacity) < 1 ||
								(style.translate !== 'none' && style.translate !== '0px')
							);
						}
					).length
			);

		expect(await disturbed()).toBe(0);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		expect(await disturbed()).toBe(0);
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('every artwork is visible', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 300 });
		await page.goto('/arts');

		await expect(items(page).last()).toBeVisible();

		const hidden = await page.evaluate(
			() =>
				Array.from(document.querySelectorAll('[data-art]')).filter(
					element => Number(getComputedStyle(element).opacity) < 1
				).length
		);
		expect(hidden).toBe(0);
	});
});
