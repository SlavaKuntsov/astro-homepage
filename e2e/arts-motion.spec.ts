import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The Arts lightbox's motion (ticket #35): the dialog scales and fades in with
 * its backdrop, reverses out before the page is released, and crossfades the
 * image while stepping. The native `<dialog>` contract — Esc, backdrop, close
 * button, focus trap, arrows, swipe, focus restore — is pinned separately by
 * `e2e/arts.spec.ts`; this file adds only what is seen while and after the
 * animations run, plus the reduced-motion path.
 *
 * The motion token is slowed down per test, so the middle of an animation is
 * observable instead of racing a ~220ms transition. The end states are then
 * asserted to settle back to exactly one fully opaque image.
 */

const lightbox = (page: Page) => page.locator('[data-arts-lightbox]');
const image = (page: Page) => page.locator('[data-arts-lightbox-image]');
const stage = (page: Page) => page.locator('[data-arts-lightbox-stage]');
const caption = (page: Page) => page.locator('[data-arts-lightbox-caption]');
const counter = (page: Page) => page.locator('[data-arts-lightbox-counter]');
const closeButton = (page: Page) => page.locator('[data-arts-lightbox-close]');
const nextButton = (page: Page) => page.locator('[data-arts-lightbox-next]');
const firstOpener = (page: Page) => page.locator('[data-art-open]').first();
const items = (page: Page) => page.locator('[data-art]');

/** The title of the nth Artwork in the gallery, in display order. */
const titleAt = (page: Page, index: number) =>
	items(page).nth(index).locator('[data-art-title]').innerText();

/** Slows the lightbox motion so its middle can be observed deterministically. */
const slowMotion = (page: Page, ms = 800) =>
	page.addStyleTag({
		content: `:root { --motion-lightbox-duration: ${ms}ms; }`
	});

/** The dialog's painted opacity, scale, and the backdrop's opacity. */
const paint = (page: Page) =>
	lightbox(page).evaluate(element => {
		const dialog = element as HTMLElement;
		const style = getComputedStyle(dialog);
		return {
			dialogOpacity: Number(style.opacity),
			scale: Number(style.scale === 'none' ? 1 : style.scale),
			backdropOpacity: Number(getComputedStyle(dialog, '::backdrop').opacity)
		};
	});

/** The number of image layers in the stage, and the canonical image's opacity. */
const stagePaint = (page: Page) =>
	stage(page).evaluate(element => {
		const canonical = element.querySelector<HTMLImageElement>(
			'[data-arts-lightbox-image]'
		);
		return {
			layers: element.querySelectorAll('img').length,
			opacity:
				canonical === null ? 0 : Number(getComputedStyle(canonical).opacity),
			activeAnimations: canonical?.getAnimations().length ?? 0
		};
	});

/**
 * Waits two frames, so a just-started CSS animation has painted its first
 * frame — computed styles in the same tick as the trigger still read the old
 * value.
 */
const nextPaint = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<void>(resolve => {
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
			})
	);

/** Opens the lightbox and waits for the opening animation to settle. */
const openSettled = async (page: Page) => {
	const opener = firstOpener(page);
	await opener.click();
	await expect(lightbox(page)).toHaveJSProperty('open', true);
	await expect.poll(async () => (await paint(page)).dialogOpacity).toBe(1);
	return opener;
};

test.describe('the lightbox opens and closes with motion', () => {
	test('fades and scales the dialog in with its backdrop, then settles', async ({
		page
	}) => {
		await page.goto('/ru/arts');
		await slowMotion(page);

		await firstOpener(page).click();
		await expect(lightbox(page)).toHaveJSProperty('open', true);
		await nextPaint(page);

		// Asserted without retrying: the first frames are visibly mid-animation.
		const entered = await paint(page);
		expect(entered.dialogOpacity).toBeLessThan(1);
		expect(entered.scale).toBeLessThan(1);
		expect(entered.backdropOpacity).toBeLessThan(1);

		// The end state is fully opaque, full size, over a full scrim.
		await expect.poll(async () => (await paint(page)).dialogOpacity).toBe(1);
		await expect.poll(async () => (await paint(page)).scale).toBe(1);
		await expect.poll(async () => (await paint(page)).backdropOpacity).toBe(1);
	});

	test('reverses out before releasing the page, then restores focus', async ({
		page
	}) => {
		await page.goto('/ru/arts');
		await slowMotion(page);
		const opener = await openSettled(page);

		await closeButton(page).click();
		await nextPaint(page);

		// Still open and fading: the page is not released until it is gone.
		const exiting = await lightbox(page).evaluate(element => ({
			open: (element as HTMLDialogElement).open,
			opacity: Number(getComputedStyle(element).opacity),
			backdropOpacity: Number(
				getComputedStyle(element, '::backdrop').opacity
			)
		}));
		expect(exiting.open).toBe(true);
		expect(exiting.opacity).toBeLessThan(1);
		expect(exiting.backdropOpacity).toBeLessThan(1);

		await expect(lightbox(page)).toHaveJSProperty('open', false);
		await expect(opener).toBeFocused();

		// Released: another Artwork can be opened straight away.
		await firstOpener(page).click();
		await expect(lightbox(page)).toHaveJSProperty('open', true);
	});

	test('reverses from the current frame when close interrupts the open', async ({
		page
	}) => {
		await page.goto('/ru/arts');
		await slowMotion(page, 1200);

		const opener = firstOpener(page);
		await opener.click();
		await expect(lightbox(page)).toHaveJSProperty('open', true);

		// Let the enter get visibly under way before interrupting it.
		await page.waitForTimeout(400);
		const before = (await paint(page)).dialogOpacity;
		expect(before).toBeLessThan(1);

		// Closed mid-enter (Esc, because a click would wait for the scaling
		// dialog to settle): the exit continues from that frame instead of
		// snapping back to full size and fading from there.
		await page.keyboard.press('Escape');
		await nextPaint(page);
		const after = (await paint(page)).dialogOpacity;
		expect(after).toBeLessThan(1);
		expect(after).toBeLessThanOrEqual(before + 0.05);

		await expect(lightbox(page)).toHaveJSProperty('open', false);
		await expect(opener).toBeFocused();
	});
});

test.describe('the lightbox crossfades when stepping', () => {
	test('updates the caption at once and crossfades the image to a settled end', async ({
		page
	}) => {
		await page.goto('/ru/arts');
		await slowMotion(page);
		await openSettled(page);

		const total = await items(page).count();
		expect(total).toBeGreaterThan(1);

		await nextButton(page).click();

		// The caption and counter are already in step with the incoming Artwork.
		await expect(caption(page)).toHaveText(await titleAt(page, 1));
		await expect(counter(page)).toHaveText(`2 / ${total}`);

		// The canonical image already names the incoming Artwork.
		const nextThumb = await items(page)
			.nth(1)
			.locator('img')
			.evaluate(img => (img as HTMLImageElement).currentSrc);
		expect(
			await image(page).evaluate(img => (img as HTMLImageElement).currentSrc)
		).toBe(nextThumb);

		// Two layers while the old Artwork fades out under the new one.
		expect((await stagePaint(page)).layers).toBe(2);

		// End state: one settled, fully opaque image — no snapshot left behind.
		await expect.poll(async () => (await stagePaint(page)).layers).toBe(1);
		await expect.poll(async () => (await stagePaint(page)).opacity).toBe(1);
		await expect.poll(async () => (await stagePaint(page)).activeAnimations).toBe(
			0
		);
	});

	test('leaves a usable dialog through rapid step and close sequences', async ({
		page
	}) => {
		await page.goto('/ru/arts');
		await slowMotion(page, 400);

		const opener = firstOpener(page);
		await opener.click();
		await expect(lightbox(page)).toHaveJSProperty('open', true);

		// Steps raised back to back, including while the crossfades are moving.
		for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');

		// Esc twice: the second cancel must not wedge the deferred close.
		await page.keyboard.press('Escape');
		await page.keyboard.press('Escape');

		await expect(lightbox(page)).toHaveJSProperty('open', false);
		await expect(opener).toBeFocused();

		await firstOpener(page).click();
		await expect(lightbox(page)).toHaveJSProperty('open', true);
	});
});

test.describe('prefers-reduced-motion: reduce', () => {
	test.use({ reducedMotion: 'reduce' });

	test('open, step, and close are instantaneous', async ({ page }) => {
		await page.goto('/ru/arts');

		const opener = firstOpener(page);
		await opener.click();

		// Fully open on the same frame, with no animation left running.
		await expect(lightbox(page)).toHaveJSProperty('open', true);
		const opened = await paint(page);
		expect(opened).toEqual({
			dialogOpacity: 1,
			scale: 1,
			backdropOpacity: 1
		});

		const total = await items(page).count();
		await nextButton(page).click();
		await expect(caption(page)).toHaveText(await titleAt(page, 1));
		await expect(counter(page)).toHaveText(`2 / ${total}`);

		const stepped = await stagePaint(page);
		expect(stepped.layers).toBe(1);
		expect(stepped.opacity).toBe(1);
		expect(stepped.activeAnimations).toBe(0);

		await closeButton(page).click();
		await expect(lightbox(page)).toHaveJSProperty('open', false);
		await expect(opener).toBeFocused();
	});
});
