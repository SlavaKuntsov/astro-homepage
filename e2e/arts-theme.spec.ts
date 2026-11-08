import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The Arts gallery must not stutter during a Theme switch (ticket #43). The
 * page background animates a paint property for the whole 300 ms curve, so the
 * gallery — which sits in that paint region — is re-rastered on every frame.
 * The fix paints the paper wash as a static mask over a solid color and, for
 * the switch only, promotes the Artwork cards to their own compositor layers.
 *
 * These tests pin the mechanism, not a millisecond count: the in-flight state
 * is present while the switch runs, released afterwards (bounded in time), and
 * absent at rest. Removing the promotion — so the cards go back to being
 * re-rastered per frame — turns the "during" assertions red, and reverting the
 * wash to a Theme gradient turns the wash assertion red.
 *
 * The curve is slowed per test so the middle of a switch is observable instead
 * of racing a ~300 ms transition; the script reads the duration it is actually
 * given, so the fallback release stretches with it.
 */

const panel = (page: Page) => page.locator('[data-arts-panel]');
const stickers = (page: Page) => page.locator('[data-arts-panel] .art-sticker');

/** Slows the Theme curve so a switch's in-flight state is observable. */
const slowTheme = (page: Page, ms = 1500) =>
	page.addStyleTag({
		content: `html.theme-ready body { transition-duration: ${ms}ms !important; }`
	});

/** The `will-change` a card resolves to, the hint that gives it its own layer. */
const willChangeOf = (page: Page) =>
	stickers(page)
		.first()
		.evaluate(element => getComputedStyle(element).willChange);

/** The toggle's accessible name for the Theme it switches *to*. */
const toggleTo = (next: 'dark' | 'light') =>
	next === 'dark' ? /dark theme|тёмную тему/i : /light theme|светлую тему/i;

test.describe('the Arts gallery during a Theme switch', () => {
	// Both Locales and both directions (acceptance criterion of #43).
	for (const path of ['/arts', '/ru/arts'] as const) {
		for (const from of ['light', 'dark'] as const) {
			const next = from === 'light' ? 'dark' : 'light';

			test(`${path}: ${from}→${next} promotes the cards, then releases them`, async ({
				page,
				seedLocalStorage
			}) => {
				await seedLocalStorage({ theme: from });
				await page.goto(path);
				await page.waitForSelector('html.theme-ready');
				await slowTheme(page);

				await page.getByRole('button', { name: toggleTo(next) }).click();

				// In flight: the panel carries the marker and the cards are promoted.
				await expect(panel(page)).toHaveAttribute(
					'data-theme-switching',
					'true'
				);
				expect(await willChangeOf(page)).toContain('transform');

				// Released once the background transition settles.
				await expect(panel(page)).not.toHaveAttribute(
					'data-theme-switching',
					'true',
					{ timeout: 5000 }
				);
				await expect(page.locator('html')).toHaveAttribute(
					'data-theme',
					next
				);
			});
		}
	}

	test('paints the paper wash as a static mask over a solid, not a Theme gradient', async ({
		page
	}) => {
		await page.goto('/arts');
		await page.waitForSelector('html.theme-ready');

		const wash = await panel(page).evaluate(element => {
			const before = getComputedStyle(element, '::before');
			return {
				panelImage: getComputedStyle(element).backgroundImage,
				washImage: before.backgroundImage,
				mask:
					before.getPropertyValue('mask-image') ||
					before.getPropertyValue('-webkit-mask-image')
			};
		});

		// A gradient whose stops come from a Theme token is re-resolved on every
		// frame of the switch; the wash is a solid color behind a static mask.
		expect(wash.panelImage).toBe('none');
		expect(wash.washImage).toBe('none');
		expect(wash.mask).toContain('repeating-linear-gradient');
	});

	test('leaves the gallery compositing unchanged at rest', async ({ page }) => {
		await page.goto('/arts');
		await page.waitForSelector('html.theme-ready');

		await expect(panel(page)).not.toHaveAttribute(
			'data-theme-switching',
			'true'
		);

		// No permanent promotion: every card composites exactly as before.
		for (const willChange of await stickers(page).evaluateAll(elements =>
			elements.map(element => getComputedStyle(element).willChange)
		)) {
			expect(willChange).toBe('auto');
		}
	});

	test('releases the state on a bounded timeout when the transition never ends', async ({
		page
	}) => {
		await page.goto('/arts');
		await page.waitForSelector('html.theme-ready');

		await page.getByRole('button', { name: toggleTo('dark') }).click();
		await expect(panel(page)).toHaveAttribute('data-theme-switching', 'true');

		// Suppress the `transitionend` the release normally waits for — what a
		// backgrounded tab effectively does. The bounded fallback must still
		// drop the state, so the cards can never stay promoted.
		await page.evaluate(() => {
			document.body.style.transition = 'none';
		});

		await expect(panel(page)).not.toHaveAttribute(
			'data-theme-switching',
			'true',
			{ timeout: 1500 }
		);
	});

	test('never carries the in-flight state across a client-side navigation', async ({
		page
	}) => {
		await page.goto('/arts');
		await page.waitForSelector('html.theme-ready');
		await slowTheme(page, 2000);

		await page.getByRole('button', { name: toggleTo('dark') }).click();
		await expect(panel(page)).toHaveAttribute('data-theme-switching', 'true');

		// Navigate away while the switch is still in flight, then back.
		await page.locator('header nav a[href="/"]').first().click();
		await page.waitForURL(url => new URL(url).pathname === '/');
		await page.locator('header nav a[href="/arts"]').first().click();
		await page.waitForURL('**/arts');

		// The fresh gallery is not promoted, and the Theme still applied.
		await expect(panel(page)).not.toHaveAttribute(
			'data-theme-switching',
			'true'
		);
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	});
});

test.describe('prefers-reduced-motion: reduce', () => {
	test.use({ reducedMotion: 'reduce' });

	test('switches instantly without promoting the gallery', async ({ page }) => {
		await page.goto('/arts');
		await page.waitForSelector('html.theme-ready');

		await page.getByRole('button', { name: toggleTo('dark') }).click();

		// Instant: the Theme is applied and no in-flight state ever appears.
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
		await expect(panel(page)).not.toHaveAttribute(
			'data-theme-switching',
			'true'
		);
	});
});
