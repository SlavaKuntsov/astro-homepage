import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The Projects index's motion (ticket #34). The cards join the Site-wide reveal
 * (`e2e/reveal.spec.ts`, ticket #28): the ones below the fold fade and rise into
 * place with the row stagger, while the cards already on screen at load are
 * painted at full strength on the first frame. Each card also lifts, deepens its
 * shadow, and zooms its cover on hover or keyboard focus — the same tactile feel
 * as an Artwork sticker — without moving the layout or changing the whole-card
 * link.
 *
 * This is the rendered-page seam, so it asserts what a visitor sees — painted
 * opacity, position, shadow, cover scale, and the focus ring — never the
 * mechanism's private attributes. The shared reveal itself is pinned by
 * `e2e/reveal.spec.ts`; `e2e/projects.spec.ts` pins the index's content,
 * ordering, and links, which this motion must leave unchanged.
 */

const LOCALES = ['/projects', '/ru/projects'] as const;

/** One Project's `<li>` — the item the shared reveal hides and lifts. */
const CARDS = '[data-project]';
/** The inner card that carries the border, radius, shadow, and hover lift. */
const CARD = '[data-project-card]';
const COVER = '[data-project-cover]';

interface Paint {
	opacity: number;
	translate: string;
	onScreen: boolean;
}

/** Every card's painted opacity and translate, and whether it is on screen. */
const paintOf = (page: Page): Promise<Paint[]> =>
	page.evaluate(
		selector =>
			Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
				element => {
					const style = getComputedStyle(element);
					return {
						opacity: Number(style.opacity),
						translate: style.translate,
						// The script hides items whose top is strictly past the fold, so
						// "on screen" must include a card sitting exactly on it.
						onScreen: element.getBoundingClientRect().top <= window.innerHeight,
					};
				}
			),
		CARDS
	);

/** Faded or lifted — the reveal's hidden state, read from what is painted. */
const isDisturbed = (paint: Paint) =>
	paint.opacity < 1 ||
	(paint.translate !== 'none' && paint.translate !== '0px');

/** The cards currently in the hidden state. */
const disturbed = async (page: Page) =>
	(await paintOf(page)).filter(isDisturbed);

/** The Y translation in pixels of a computed `translate` value. */
const translateY = (translate: string): number => {
	if (translate === 'none') return 0;
	const parts = translate.split(/\s+/);
	return parseFloat(parts[1] ?? parts[0] ?? '0');
};

/** The scale factor of a computed `scale` value; `none` is the identity. */
const scaleOf = (scale: string): number =>
	scale === 'none' ? 1 : parseFloat(scale);

interface Tactile {
	translate: string;
	shadow: string;
	scale: string;
}

/** One inner card's lift, shadow, and cover zoom — the tactile state. */
const tactileOf = (page: Page, index: number): Promise<Tactile> =>
	page.evaluate(
		({ cardSelector, coverSelector, index }) => {
			const card = document.querySelectorAll<HTMLElement>(cardSelector)[index];
			const cover = card.querySelector<HTMLElement>(coverSelector);
			const cardStyle = getComputedStyle(card);
			return {
				translate: cardStyle.translate,
				shadow: cardStyle.boxShadow,
				scale: cover ? getComputedStyle(cover).scale : 'none',
			};
		},
		{ cardSelector: CARD, coverSelector: COVER, index }
	);

/** One card's flow geometry — layout offsets, which ignore the lift transform. */
const layoutOf = (page: Page, index: number) =>
	page.evaluate(
		({ cardSelector, index }) => {
			const layoutOffset = (element: HTMLElement) => {
				let top = 0;
				let left = 0;
				for (
					let node: HTMLElement | null = element;
					node !== null;
					node = node.offsetParent as HTMLElement | null
				) {
					top += node.offsetTop;
					left += node.offsetLeft;
				}
				return { top, left };
			};

			return layoutOffset(
				document.querySelectorAll<HTMLElement>(cardSelector)[index]
			);
		},
		{ cardSelector: CARD, index }
	);

/** The focus ring (an outline) painted on a card while its link is focused. */
const focusRingOf = (page: Page, index: number) =>
	page.evaluate(
		({ cardSelector, index }) => {
			const style = getComputedStyle(
				document.querySelectorAll<HTMLElement>(cardSelector)[index]
			);
			return { style: style.outlineStyle, width: style.outlineWidth };
		},
		{ cardSelector: CARD, index }
	);

test.describe('the cards join the reveal', () => {
	for (const path of LOCALES) {
		test(`${path} paints the cards on screen at load at full strength`, async ({
			page,
		}) => {
			// The reveal may only hide cards below the fold. A card caught
			// mid-reveal while it is on screen is a first-frame bug: it would flash
			// missing content, and on a page too short to scroll it would stay faded.
			for (const height of [400, 800, 1400]) {
				await page.setViewportSize({ width: 1280, height });
				await page.goto(path);

				// Asserted without retrying: a faded card must not pass by fading in.
				const onScreen = (await paintOf(page)).filter(paint => paint.onScreen);
				expect(onScreen.length).toBeGreaterThan(0);
				expect(onScreen.filter(isDisturbed)).toEqual([]);
			}
		});

		test(`${path} reveals each below-the-fold card as it is scrolled to`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// Which cards the browser actually put below the fold — the reveal may
			// hide those and only those, so the test asks the layout rather than
			// assuming a card is off screen.
			const belowFold = (await paintOf(page)).filter(paint => !paint.onScreen);
			expect(belowFold.length).toBeGreaterThan(0);

			// Every below-fold card starts hidden. Asserted before the first scroll:
			// scrolling to one card also brings its neighbours into view.
			await expect
				.poll(async () => (await disturbed(page)).length)
				.toBe(belowFold.length);

			const last = page.locator(CARDS).last();
			await last.scrollIntoViewIfNeeded();
			await expect(last).toHaveCSS('opacity', '1');

			// The reveal runs once: scrolling back to the top leaves every card
			// revealed rather than fading it out again.
			await page.evaluate(() => window.scrollTo(0, 0));
			await expect(last).toHaveCSS('opacity', '1');
		});

		test(`${path} delays each card by its column in the two-column grid`, async ({
			page,
		}) => {
			// Short enough that the whole grid is below the fold, so the first row's
			// two cards are both scheduled and the column-derived stagger is
			// observable — a one-column phone view would only ever show column 0.
			await page.setViewportSize({ width: 1280, height: 200 });
			await page.goto(path);

			const { columns, stagger, cards } = await page.evaluate(() => {
				const root = getComputedStyle(document.documentElement);
				const list = document.querySelector<HTMLElement>(
					'[data-projects-list]'
				);
				const nodes = Array.from(
					document.querySelectorAll<HTMLElement>('[data-project]')
				);
				return {
					columns: list
						? getComputedStyle(list)
								.gridTemplateColumns.split(/\s+/)
								.filter(Boolean).length
						: 0,
					stagger: parseFloat(root.getPropertyValue('--motion-reveal-stagger')),
					cards: nodes.map(node => {
						const style = getComputedStyle(node);
						return {
							duration: style.transitionDuration,
							delay: parseFloat(style.transitionDelay) * 1000,
						};
					}),
				};
			});

			// The grid resolved to a real multi-column layout, so the oracle below is
			// about the rows the browser actually painted.
			expect(columns).toBeGreaterThan(1);

			// The mechanism gives every below-the-fold card a reveal transition; the
			// computed transition is the public signal of which cards were hidden.
			const revealed = cards.filter(card => parseFloat(card.duration) > 0);
			expect(revealed.length).toBeGreaterThan(0);

			// A row-major grid fills left to right, so a card's column is its index
			// modulo the rendered column count — an oracle independent of how the
			// mechanism groups rows. At least one revealed card must sit in column 1,
			// so the test cannot pass vacuously on a single-column layout.
			expect(revealed.some(card => cards.indexOf(card) % columns === 1)).toBe(
				true
			);

			for (const card of revealed) {
				const column = cards.indexOf(card) % columns;
				expect(card.delay).toBeCloseTo(column * stagger, 1);
			}
		});
	}
});

test.describe('a card lifts on hover and focus', () => {
	for (const path of LOCALES) {
		test(`${path} lifts the card, deepens the shadow, and zooms the cover on hover`, async ({
			page,
		}) => {
			// Tall enough that the first card is on screen and settled.
			await page.setViewportSize({ width: 1280, height: 1400 });
			await page.goto(path);

			const card = page.locator(CARD).first();
			await expect(card).toBeVisible();

			const rest = await tactileOf(page, 0);
			expect(translateY(rest.translate)).toBe(0);
			expect(scaleOf(rest.scale)).toBe(1);

			const before = await layoutOf(page, 0);

			await card.hover();
			await expect
				.poll(async () => translateY((await tactileOf(page, 0)).translate))
				.toBeLessThan(0);

			const lifted = await tactileOf(page, 0);
			expect(translateY(lifted.translate)).toBeLessThan(0);
			expect(lifted.shadow).not.toBe(rest.shadow);
			expect(scaleOf(lifted.scale)).toBeGreaterThan(1);

			// The lift is a transform, so the card's flow geometry is unchanged:
			// no layout shift.
			expect(await layoutOf(page, 0)).toEqual(before);
		});

		test(`${path} lifts the card and keeps the focus ring on keyboard focus`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1280, height: 1400 });
			await page.goto(path);

			const card = page.locator(CARDS).first();
			const slug = await card.getAttribute('data-slug');
			const title = await card.getByRole('heading', { level: 2 }).innerText();
			const rest = await tactileOf(page, 0);

			// The whole card is one link. Focus it the way a keyboard user would so
			// `:focus-visible` — and the visible ring — actually applies: focus the
			// link, then step away and back with Tab to establish keyboard modality.
			const link = card.getByRole('link');
			await link.focus();
			await page.keyboard.press('Shift+Tab');
			await page.keyboard.press('Tab');
			await expect(link).toBeFocused();

			// The whole-card link, its accessible name, and its href are unchanged.
			const prefix = path.startsWith('/ru') ? '/ru' : '';
			await expect(link).toHaveAccessibleName(title);
			await expect(link).toHaveAttribute('href', `${prefix}/projects/${slug}`);

			// The focus ring is visible on the card, not detached from it.
			const ring = await focusRingOf(page, 0);
			expect(ring.style).toBe('solid');
			expect(parseFloat(ring.width)).toBeGreaterThan(0);

			// Focusing the link lifts the card, deepens its shadow, and zooms its
			// cover, exactly as hover does.
			await expect
				.poll(async () => translateY((await tactileOf(page, 0)).translate))
				.toBeLessThan(0);
			const focused = await tactileOf(page, 0);
			expect(focused.shadow).not.toBe(rest.shadow);
			expect(scaleOf(focused.scale)).toBeGreaterThan(1);
		});
	}
});

test.describe('the layout is unchanged', () => {
	for (const path of LOCALES) {
		test(`${path} is one column at 360px and two from sm up, without overflow`, async ({
			page,
		}) => {
			const columns = () =>
				page.evaluate(() => {
					const list = document.querySelector<HTMLElement>(
						'[data-projects-list]'
					);
					if (!list) return 0;
					return getComputedStyle(list)
						.gridTemplateColumns.split(/\s+/)
						.filter(Boolean).length;
				});

			await page.setViewportSize({ width: 360, height: 800 });
			await page.goto(path);
			expect(await columns()).toBe(1);

			// A fluid one-column list must not overflow the narrow viewport.
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth + 1
				)
			).toBe(true);

			await page.setViewportSize({ width: 1024, height: 800 });
			expect(await columns()).toBe(2);
		});
	}
});

test.describe('prefers-reduced-motion: reduce', () => {
	test.use({ reducedMotion: 'reduce' });

	for (const path of LOCALES) {
		test(`${path} removes the lift, the zoom, and the reveal`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// The reveal hides and moves nothing, whether a card is on screen or
			// below it.
			expect(await disturbed(page)).toEqual([]);

			// Hovering the first card lifts nothing and zooms nothing.
			await page.locator(CARD).first().hover();
			const hovered = await tactileOf(page, 0);
			expect(translateY(hovered.translate)).toBe(0);
			expect(scaleOf(hovered.scale)).toBe(1);

			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			expect(await disturbed(page)).toEqual([]);
		});
	}
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	for (const path of LOCALES) {
		test(`${path} shows every card at full strength`, async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			expect(await disturbed(page)).toEqual([]);
		});
	}
});
