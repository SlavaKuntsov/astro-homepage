import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The `arts` collection and its gallery with a lightbox (ticket #10, ADR-0004).
 * This is the rendered-page seam, so it asserts what a visitor sees and does:
 * a responsive grid of Artworks per Locale, and a lightbox that opens on a
 * click or Enter, closes on Esc, the close button, or the backdrop, keeps focus
 * inside itself, hands focus back to the thumbnail that opened it, and steps
 * between Artworks with its buttons, the arrow keys, or a swipe.
 *
 * The schema, the manifest ordering, and the slug pairing are pinned by unit
 * tests (`src/lib/arts.test.ts`); here they are only observed through the page.
 */

const items = (page: Page) => page.locator('[data-art]');
const gallery = (page: Page) => page.locator('[data-arts-gallery]');
const lightbox = (page: Page) => page.locator('[data-arts-lightbox]');
const lightboxImage = (page: Page) =>
	page.locator('[data-arts-lightbox-image]');
const lightboxCaption = (page: Page) =>
	page.locator('[data-arts-lightbox-caption]');
const closeButton = (page: Page) => page.locator('[data-arts-lightbox-close]');
const previousButton = (page: Page) =>
	page.locator('[data-arts-lightbox-previous]');
const nextButton = (page: Page) => page.locator('[data-arts-lightbox-next]');
const counter = (page: Page) => page.locator('[data-arts-lightbox-counter]');
const firstOpener = (page: Page) => page.locator('[data-art-open]').first();

const titleOf = (item: Locator) => item.locator('[data-art-title]').innerText();

/** The title of the nth Artwork in the gallery, in display order. */
const titleAt = (page: Page, index: number) => titleOf(items(page).nth(index));

/** Opens the lightbox from the first thumbnail and returns that opener. */
const openLightbox = async (page: Page) => {
	const opener = firstOpener(page);
	await opener.click();

	await expect(lightbox(page)).toHaveJSProperty('open', true);

	return opener;
};

/** Drags horizontally across the lightbox image by `distance` pixels. */
const swipe = async (page: Page, distance: number) => {
	const box = await lightboxImage(page).boundingBox();
	if (!box) throw new Error('the lightbox image has no box');

	const y = box.y + box.height / 2;
	const from = box.x + box.width / 2;

	await page.mouse.move(from, y);
	await page.mouse.down();
	await page.mouse.move(from + distance, y, { steps: 8 });
	await page.mouse.up();
};

test.describe('the RU arts gallery at /arts', () => {
	test('renders an H1 and one artwork per item', async ({ page }) => {
		const response = await page.goto('/arts');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Картиночки' })
		).toBeVisible();

		await expect(gallery(page)).toHaveAttribute('aria-label', 'Галерея');

		const all = items(page);
		expect(await all.count()).toBeGreaterThanOrEqual(1);

		for (const item of await all.all()) {
			// Each Artwork is one image with a visible, non-empty title, and the
			// whole item is a link — so a keyboard user can open it.
			await expect(item.locator('img')).toBeVisible();
			await expect(item.locator('[data-art-title]')).not.toBeEmpty();
			await expect(item.getByRole('link').first()).not.toBeEmpty();
		}
	});

	test('renders thumbnails that scale with the viewport', async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto('/arts');

		for (const img of await page.locator('[data-art-thumb]').all()) {
			await expect(img).toHaveAttribute('loading', 'lazy');
			await expect(img).toHaveAttribute('width', /\d+/);
			await expect(img).toHaveAttribute('height', /\d+/);
		}

		// A fluid grid must not overflow the narrow viewport (spec: responsive
		// images), and the images must be laid out inside it.
		const fits = await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth + 1
		);
		expect(fits).toBe(true);

		const box = await firstOpener(page).locator('img').boundingBox();
		expect(box?.width ?? 0).toBeGreaterThan(0);
		expect(box?.width ?? 9999).toBeLessThanOrEqual(360);
	});

	test('paints every artwork on screen at full strength on load', async ({
		page,
	}) => {
		// The scroll reveal may only hide Artworks below the fold. A card caught
		// mid-reveal while it is on screen is a first-frame bug, and on a page
		// too short to scroll (the 1100 case) it used to stay faded for good.
		for (const height of [400, 700, 900, 1100]) {
			await page.setViewportSize({ width: 1280, height });
			await page.goto('/arts');

			// Asserted without retrying: a faded card must not pass by fading in.
			const faded = await items(page).evaluateAll(nodes =>
				nodes
					.filter(node => node.getBoundingClientRect().top < window.innerHeight)
					.map(node => Number(getComputedStyle(node).opacity))
					.filter(opacity => opacity < 1)
			);
			expect(faded).toEqual([]);
		}
	});

	test('shows the tags of an artwork that has them', async ({ page }) => {
		await page.goto('/arts');

		const tags = items(page).first().getByRole('list', { name: 'Теги' });
		await expect(tags).toBeVisible();
		await expect(tags.locator('li').first()).not.toBeEmpty();
	});

	test('opens the lightbox on click, showing the same image and title', async ({
		page,
	}) => {
		await page.goto('/arts');

		const item = items(page).first();
		const title = await titleOf(item);

		const opener = await openLightbox(page);

		// The lightbox shows the same Artwork the grid loaded — compare the
		// browser's chosen source (`currentSrc`), not the `<img src>` fallback:
		// `<Picture>` emits an AVIF/WebP set with a PNG fallback, so the two
		// attributes differ.
		const thumbSrc = await opener
			.locator('img')
			.evaluate(img => (img as HTMLImageElement).currentSrc);
		expect(
			await lightboxImage(page).evaluate(
				img => (img as HTMLImageElement).currentSrc
			)
		).toBe(thumbSrc);

		await expect(lightboxCaption(page)).toHaveText(title);
		// The dialog is named by the Artwork it shows, not a generic label.
		await expect(lightbox(page)).toHaveAccessibleName(title);
		await expect(closeButton(page)).toBeFocused();
	});

	test('opens the lightbox from anywhere on the card', async ({ page }) => {
		await page.goto('/arts');

		// The tag chips sit below the title, outside the opener's own box, so
		// only the opener's stretched overlay can make them open the Artwork.
		// Clicked with the mouse: Playwright would rightly call the chip
		// obscured, because the overlay is what receives the click.
		const chip = items(page)
			.first()
			.getByRole('list', { name: 'Теги' })
			.locator('li')
			.first();
		const box = await chip.boundingBox();
		if (!box) throw new Error('the tag chip has no box');

		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

		await expect(lightbox(page)).toHaveJSProperty('open', true);
		await expect(lightboxCaption(page)).toHaveText(await titleAt(page, 0));
	});

	test('opens the lightbox with the keyboard', async ({ page }) => {
		await page.goto('/arts');

		await firstOpener(page).focus();
		await page.keyboard.press('Enter');

		await expect(lightbox(page)).toHaveJSProperty('open', true);
	});

	test('closes on Esc and returns focus to the thumbnail', async ({ page }) => {
		await page.goto('/arts');

		const opener = await openLightbox(page);
		await page.keyboard.press('Escape');

		await expect(lightbox(page)).toHaveJSProperty('open', false);
		await expect(opener).toBeFocused();
	});

	test('closes on the close button and returns focus', async ({ page }) => {
		await page.goto('/arts');

		const opener = await openLightbox(page);
		await closeButton(page).click();

		await expect(lightbox(page)).toHaveJSProperty('open', false);
		await expect(opener).toBeFocused();
	});

	test('closes when the backdrop is clicked', async ({ page }) => {
		await page.goto('/arts');

		await openLightbox(page);

		// The dialog is centred and smaller than the viewport, so the top-left
		// corner is backdrop.
		await page.mouse.click(4, 4);

		await expect(lightbox(page)).toHaveJSProperty('open', false);
	});

	test('keeps focus trapped inside the open lightbox', async ({ page }) => {
		await page.goto('/arts');

		await openLightbox(page);

		for (let i = 0; i < 4; i++) {
			await page.keyboard.press('Tab');

			const contained = await page.evaluate(
				() =>
					document
						.querySelector('[data-arts-lightbox]')
						?.contains(document.activeElement) ?? false
			);
			expect(contained).toBe(true);
		}
	});
});

test.describe('stepping through the arts lightbox', () => {
	test('shows the position of the shown artwork', async ({ page }) => {
		await page.goto('/arts');

		const total = await items(page).count();
		expect(total).toBeGreaterThan(1);

		await openLightbox(page);
		await expect(counter(page)).toHaveText(`1 / ${total}`);
	});

	test('steps with the buttons, wrapping around', async ({ page }) => {
		await page.goto('/arts');

		const total = await items(page).count();
		await openLightbox(page);

		await nextButton(page).click();
		await expect(lightboxCaption(page)).toHaveText(await titleAt(page, 1));
		await expect(counter(page)).toHaveText(`2 / ${total}`);

		// The image follows the caption. Compare the browser's chosen source
		// (`currentSrc`), not the `<img src>` fallback: `<Picture>` emits an
		// AVIF/WebP set with a PNG fallback, so the two attributes differ.
		const nextThumb = await items(page)
			.nth(1)
			.locator('img')
			.evaluate(img => (img as HTMLImageElement).currentSrc);
		expect(
			await lightboxImage(page).evaluate(
				img => (img as HTMLImageElement).currentSrc
			)
		).toBe(nextThumb);

		await previousButton(page).click();
		await expect(counter(page)).toHaveText(`1 / ${total}`);

		// Stepping back past the first Artwork wraps to the last.
		await previousButton(page).click();
		await expect(lightboxCaption(page)).toHaveText(
			await titleAt(page, total - 1)
		);
		await expect(counter(page)).toHaveText(`${total} / ${total}`);
	});

	test('steps with the arrow keys', async ({ page }) => {
		await page.goto('/arts');

		const total = await items(page).count();
		await openLightbox(page);

		await page.keyboard.press('ArrowRight');
		await expect(lightboxCaption(page)).toHaveText(await titleAt(page, 1));
		await expect(counter(page)).toHaveText(`2 / ${total}`);

		await page.keyboard.press('ArrowLeft');
		await expect(lightboxCaption(page)).toHaveText(await titleAt(page, 0));
		await expect(counter(page)).toHaveText(`1 / ${total}`);
	});

	test('steps with a swipe without closing the lightbox', async ({ page }) => {
		await page.goto('/arts');

		const total = await items(page).count();
		await openLightbox(page);

		await swipe(page, -140);
		await expect(counter(page)).toHaveText(`2 / ${total}`);
		await expect(lightbox(page)).toHaveJSProperty('open', true);

		await swipe(page, 140);
		await expect(counter(page)).toHaveText(`1 / ${total}`);
		await expect(lightbox(page)).toHaveJSProperty('open', true);
	});

	test('leaves no selection highlight over the artwork', async ({ page }) => {
		await page.goto('/arts');
		await openLightbox(page);

		// A drag in the lightbox is how a swipe starts, and it must never select
		// the Artwork: a selection paints the Theme's `--accent` — a warm peach
		// — over the picture, which reads as the Artwork turning yellow. Safari
		// selects the image from a drag inside it; Chromium needs the drag to
		// span the caption text, so this press starts on the title and ends on
		// the artwork.
		const image = await lightboxImage(page).boundingBox();
		const title = await lightboxCaption(page).boundingBox();
		if (!image || !title) throw new Error('the lightbox has no boxes');

		await page.mouse.move(
			title.x + title.width / 2,
			title.y + title.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(
			image.x + image.width / 2,
			image.y + image.height / 2,
			{ steps: 10 },
		);
		await page.mouse.up();

		/** Does the selection paint over the Artwork? */
		const highlighted = await page.evaluate(() => {
			const selection = window.getSelection();
			if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
				return false;
			}
			const box = document
				.querySelector('[data-arts-lightbox-image]')!
				.getBoundingClientRect();
			return [...selection.getRangeAt(0).getClientRects()].some(
				(rect) =>
					rect.right > box.left &&
					rect.left < box.right &&
					rect.bottom > box.top &&
					rect.top < box.bottom,
			);
		});

		expect(highlighted).toBe(false);
		await expect(lightbox(page)).toHaveJSProperty('open', true);
	});

	test('labels the navigation in the page’s Locale', async ({ page }) => {
		await page.goto('/arts');
		await openLightbox(page);

		await expect(previousButton(page)).toHaveAttribute(
			'aria-label',
			'Предыдущая работа'
		);
		await expect(nextButton(page)).toHaveAttribute(
			'aria-label',
			'Следующая работа'
		);

		await page.goto('/en/arts');
		await openLightbox(page);

		await expect(previousButton(page)).toHaveAttribute(
			'aria-label',
			'Previous artwork'
		);
		await expect(nextButton(page)).toHaveAttribute(
			'aria-label',
			'Next artwork'
		);
	});
});

test.describe('the EN arts gallery at /en/arts', () => {
	test('renders the English heading and labels', async ({ page }) => {
		const response = await page.goto('/en/arts');
		expect(response?.status()).toBe(200);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Arts' })
		).toBeVisible();
		await expect(gallery(page)).toHaveAttribute('aria-label', 'Gallery');

		const opener = await openLightbox(page);
		await expect(closeButton(page)).toHaveAttribute('aria-label', 'Close');
		await expect(lightboxCaption(page)).toHaveText(
			await titleOf(items(page).first())
		);

		await closeButton(page).click();
		await expect(opener).toBeFocused();
	});
});

test('both Locales pair the same artwork slugs', async ({ page }) => {
	await page.goto('/arts');
	const ru = await items(page).evaluateAll(nodes =>
		nodes.map(node => node.getAttribute('data-slug') ?? '')
	);

	await page.goto('/en/arts');
	const en = await items(page).evaluateAll(nodes =>
		nodes.map(node => node.getAttribute('data-slug') ?? '')
	);

	expect(ru.length).toBeGreaterThanOrEqual(1);
	expect(en).toEqual(ru);
});

test.describe('the arts page is discoverable', () => {
	test('the nav links to /arts and marks it current', async ({ page }) => {
		await page.goto('/');

		const link = page.locator('header nav a[href="/arts"]').first();
		await expect(link).toBeVisible();
		await expect(link).not.toHaveAttribute('aria-current', 'page');

		await page.goto('/arts');
		await expect(link).toHaveAttribute('aria-current', 'page');
	});

	test('the legacy /ru/arts route redirects to /arts', async ({ page }) => {
		await page.goto('/ru/arts');
		await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === '/arts');
	});
});
