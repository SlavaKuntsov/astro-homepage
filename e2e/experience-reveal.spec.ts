import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The Experience timeline's scroll reveal (ticket #33). The timeline joins the
 * Site-wide reveal (`e2e/reveal.spec.ts`, ticket #28): entries below the fold
 * fade and rise into place as a visitor scrolls, while the rail and its dots
 * stay static, so the page still reads as one continuous career line rather
 * than a series of popping blocks.
 *
 * This is the rendered-page seam, so it asserts what a visitor sees — painted
 * opacity and flow geometry, the dot's place against its entry — never the
 * mechanism's private attributes. The shared reveal itself is pinned by
 * `e2e/reveal.spec.ts`; `e2e/experience.spec.ts` pins the timeline's content
 * and its newest-to-oldest order, which this motion must leave unchanged.
 */

const LOCALES = ['/experience', '/ru/experience'] as const;

const ENTRIES = '[data-experience-entry]';
/** One role's content block — the unit the reveal fades and lifts. */
const CONTENT = '[data-experience-entry] article';
const DOTS = '[data-experience-dot]';

interface Paint {
	opacity: number;
	translate: string;
	onScreen: boolean;
}

/** The painted opacity and translate of every element matching `selector`. */
const paintOf = (page: Page, selector: string): Promise<Paint[]> =>
	page.evaluate(
		sel =>
			Array.from(document.querySelectorAll<HTMLElement>(sel)).map(element => {
				const style = getComputedStyle(element);
				return {
					opacity: Number(style.opacity),
					translate: style.translate,
					// The script hides items whose top is strictly past the fold, so
					// "on screen" must include an item sitting exactly on it — otherwise
					// a boundary item would be counted below-fold but never hidden.
					onScreen: element.getBoundingClientRect().top <= window.innerHeight,
				};
			}),
		selector
	);

/** Faded or lifted — the reveal's hidden state, read from what is painted. */
const isDisturbed = (paint: Paint) =>
	paint.opacity < 1 ||
	(paint.translate !== 'none' && paint.translate !== '0px');

/** The matching elements currently in the hidden state. */
const disturbed = async (page: Page, selector: string) =>
	(await paintOf(page, selector)).filter(isDisturbed);

/** Waits for the web fonts, so the layout baseline is final. */
const settleFonts = (page: Page) =>
	page.evaluate(() => document.fonts.ready.then(() => undefined));

/** Each entry content's reveal state and computed delay, in authored order. */
const entryTiming = (page: Page) =>
	page.evaluate(() => {
		const stagger = parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				'--motion-reveal-stagger'
			)
		);
		const entries = Array.from(
			document.querySelectorAll<HTMLElement>('[data-experience-entry]')
		).map(entry => {
			const content = entry.querySelector<HTMLElement>('article')!;
			const style = getComputedStyle(content);
			return {
				state: content.getAttribute('data-reveal-state'),
				delay: parseFloat(style.transitionDelay) * 1000,
			};
		});
		return { stagger, entries };
	});

/**
 * The rail and the dots: each entry's own opacity/translate and bordered left
 * edge (the rail segment), the dot's opacity/translate, and the dot's place
 * within its entry. A moving rail or dot shows up as a change between samples.
 */
const railState = (page: Page) =>
	page.evaluate(() => {
		const entries = Array.from(
			document.querySelectorAll<HTMLElement>('[data-experience-entry]')
		);
		const dots = document.querySelectorAll<HTMLElement>('[data-experience-dot]');

		return entries.map((entry, index) => {
			const dot = dots[index];
			const entryRect = entry.getBoundingClientRect();
			const dotRect = dot.getBoundingClientRect();
			const entryStyle = getComputedStyle(entry);
			const dotStyle = getComputedStyle(dot);

			return {
				dotOffset: {
					top: Math.round((dotRect.top - entryRect.top) * 100) / 100,
					left: Math.round((dotRect.left - entryRect.left) * 100) / 100,
				},
				dot: {
					opacity: Number(dotStyle.opacity),
					translate: dotStyle.translate,
				},
				entry: {
					opacity: Number(entryStyle.opacity),
					translate: entryStyle.translate,
					borderLeftWidth: entryStyle.borderLeftWidth,
					borderLeftStyle: entryStyle.borderLeftStyle,
					borderLeftColor: entryStyle.borderLeftColor,
				},
			};
		});
	});

/**
 * The last entry's flow geometry: its place in the page, its own box, every
 * highlight and environment chip inside it, and whether any of it overflows the
 * content column. Measured from layout offsets (`offsetParent`), which ignore
 * transforms, so a reveal that lifts the content moves a painted box on purpose
 * while the flow geometry must not change.
 */
const lastEntryGeometry = (page: Page) =>
	page.evaluate(() => {
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

		const entry = Array.from(
			document.querySelectorAll<HTMLElement>('[data-experience-entry]')
		).at(-1)!;
		const content = entry.querySelector<HTMLElement>('article')!;

		return {
			entry: layoutOffset(entry),
			content: layoutOffset(content),
			// The body's blocks, highlights, and environment chips — everything the
			// content carries must move with it and never be clipped or re-wrapped.
			items: Array.from(
				content.querySelectorAll<HTMLElement>('h3, p, li')
			).map(
				item => ({
					...layoutOffset(item),
					width: Math.round(item.getBoundingClientRect().width),
				})
			),
			overflow: content.scrollWidth - content.clientWidth,
			pageHeight: document.documentElement.scrollHeight,
		};
	});

test.describe('the timeline joins the reveal', () => {
	for (const path of LOCALES) {
		test(`${path} paints the entry content on screen at load at full strength`, async ({
			page,
		}) => {
			// The reveal may only hide content below the fold. An entry caught
			// mid-reveal while it is on screen is a first-frame bug: it would flash
			// missing content, and on a page too short to scroll it would stay faded.
			// These heights put at least one entry on screen, so the check is real.
			for (const height of [400, 800, 1400]) {
				await page.setViewportSize({ width: 1280, height });
				await page.goto(path);

				// Asserted without retrying: faded content must not pass by fading in.
				const onScreen = (await paintOf(page, CONTENT)).filter(
					paint => paint.onScreen
				);
				expect(onScreen.length).toBeGreaterThan(0);
				expect(onScreen.filter(isDisturbed)).toEqual([]);
			}
		});

		test(`${path} reveals each below-the-fold entry as it is scrolled to`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// Which entries the browser actually put below the fold — the reveal may
			// hide those and only those, so the test asks the layout rather than
			// assuming an entry is off screen.
			const belowFold = (await paintOf(page, CONTENT)).filter(
				paint => !paint.onScreen
			);
			expect(belowFold.length).toBeGreaterThan(0);

			// Every below-fold entry starts hidden. Asserted before the first scroll:
			// scrolling to one entry also brings its neighbours into view, so the
			// hidden state can only be observed up front.
			await expect
				.poll(async () => (await disturbed(page, CONTENT)).length)
				.toBe(belowFold.length);

			const contents = page.locator(CONTENT);
			const count = await contents.count();
			for (let index = 0; index < count; index++) {
				const content = contents.nth(index);
				const onScreen = await content.evaluate(
					element => element.getBoundingClientRect().top < window.innerHeight
				);
				if (onScreen) continue;

				// Scrolled to, so it fades into place.
				await content.scrollIntoViewIfNeeded();
				await expect(content).toHaveCSS('opacity', '1');
			}

			// The reveal runs once: scrolling back to the top leaves every entry
			// revealed rather than fading it out again.
			await page.evaluate(() => window.scrollTo(0, 0));
			for (let index = 0; index < count; index++) {
				await expect(contents.nth(index)).toHaveCSS('opacity', '1');
			}
		});
	}
});

test.describe('the timeline cascades down the page', () => {
	for (const path of LOCALES) {
		test(`${path} delays each entry by its authored order, one shared step apart`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			const { stagger, entries } = await entryTiming(page);
			expect(stagger).toBeGreaterThan(0);

			// At least the tail of the timeline is below the fold, so the cascade is
			// observable; an entry already on screen at load is left alone.
			expect(entries.some(entry => entry.state === 'pending')).toBe(true);

			for (const [index, entry] of entries.entries()) {
				if (entry.state !== 'pending') continue;
				// The step is the authored order times the shared stagger token — not a
				// magic per-component value.
				expect(entry.delay).toBeCloseTo(index * stagger, 1);
			}
		});
	}
});

test.describe('the rail and dots never move or fade', () => {
	for (const path of LOCALES) {
		test(`${path} keeps the rail and dots static while the entry content animates`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);
			await settleFonts(page);

			// At least one entry is below the fold, so the page is genuinely
			// mid-reveal and a moving rail would show.
			expect((await disturbed(page, CONTENT)).length).toBeGreaterThan(0);

			const before = await railState(page);

			// The rail segments and their dots are painted at full strength and in
			// place, never faded or lifted, even while their entry's content hides.
			for (const state of before) {
				expect(parseFloat(state.entry.borderLeftWidth)).toBeGreaterThan(0);
				expect(state.entry.borderLeftStyle).not.toBe('none');
				expect(state.entry.opacity).toBe(1);
				expect(state.entry.translate).toBe('none');
				expect(state.dot.opacity).toBe(1);
				expect(state.dot.translate).toBe('none');
			}

			await page.locator(ENTRIES).last().scrollIntoViewIfNeeded();
			await expect(page.locator(CONTENT).last()).toHaveCSS('opacity', '1');

			// After the reveal, every dot sits in exactly the same place within its
			// entry and every rail segment is unchanged.
			expect(await railState(page)).toEqual(before);
		});

		test(`${path} places a dot for every entry, each on the rail`, async ({
			page,
		}) => {
			await page.goto(path);

			const entries = page.locator(ENTRIES);
			await expect(page.locator(DOTS)).toHaveCount(await entries.count());
		});
	}
});

test.describe('the entry content reveals as one unit', () => {
	for (const path of LOCALES) {
		// A phone, where the chips wrap, and a wide screen, where the column is at
		// its full width.
		for (const width of [360, 1280]) {
			test(`${path} at ${width}px keeps the body, highlights, and chips in place`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: 300 });
				await page.goto(path);
				await settleFonts(page);

				const content = page.locator(CONTENT).last();

				// The last entry is below the fold and hidden, so the comparison is a
				// test of the reveal and not of an untouched entry.
				await expect(content).toHaveCSS('opacity', '0');

				// Before the reveal: measured while the content is still hidden.
				const hidden = await lastEntryGeometry(page);
				expect(hidden.overflow).toBeLessThanOrEqual(1);
				expect(hidden.items.length).toBeGreaterThan(0);
				for (const item of hidden.items) {
					expect(item.width).toBeGreaterThan(0);
				}

				await content.scrollIntoViewIfNeeded();
				await expect(content).toHaveCSS('opacity', '1');

				// After the reveal: identical flow geometry — the same body, highlights,
				// and chips in the same places, an unchanged entry, and an unchanged page
				// height, so nothing was pushed, pulled, or clipped.
				expect(await lastEntryGeometry(page)).toEqual(hidden);
			});
		}
	}
});

test.describe('prefers-reduced-motion: reduce', () => {
	test.use({ reducedMotion: 'reduce' });

	for (const path of LOCALES) {
		test(`${path} hides and moves nothing, before or after scrolling`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// Nothing is hidden or moved, whether it is on screen or below it.
			expect(await disturbed(page, CONTENT)).toEqual([]);

			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			expect(await disturbed(page, CONTENT)).toEqual([]);
		});
	}
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	for (const path of LOCALES) {
		test(`${path} shows every entry at full strength`, async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			expect(await disturbed(page, CONTENT)).toEqual([]);
		});
	}
});
