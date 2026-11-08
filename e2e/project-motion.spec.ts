import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { gallerySlugs, repoSlugs } from './project-data';

/**
 * The Project detail page's two motions (ticket #31): the image gallery joins
 * the Site-wide scroll reveal, and the Enrichment language breakdown's bars grow
 * from zero to their authored percentage when the breakdown is scrolled to.
 *
 * This is the rendered-page seam, so it asserts what a visitor sees — painted
 * opacity and position for the images, and the bar's width as a share of its
 * track against the percentage printed beside it — never the mechanism's
 * private attributes. The shared reveal itself is pinned by
 * `e2e/reveal.spec.ts` (ticket #28); this file pins only the detail page's use
 * of it.
 *
 * The gallery scenario picks whichever published Project authors a multi-image
 * gallery, and the language-breakdown scenario whichever names a public repo.
 * The breakdown exists only when the build-time Enrichment reached GitHub, so
 * its tests skip when it did not: the page must render either way, exactly as
 * `e2e/projects.spec.ts` already tolerates.
 */

const IMAGES = '[data-project-image]';
const BREAKDOWN = '[data-project-languages]';
const BARS = '[data-language-bar]';

const LOCALE_PREFIXES = ['', '/ru'] as const;

/** Routes whose Project authors a multi-image gallery. */
const GALLERY_ROUTES = LOCALE_PREFIXES.flatMap(prefix =>
	gallerySlugs.map(slug => `${prefix}/projects/${slug}`)
);

/** Routes whose Project names a public repo, so Enrichment may add languages. */
const BREAKDOWN_ROUTES = LOCALE_PREFIXES.flatMap(prefix =>
	repoSlugs.map(slug => `${prefix}/projects/${slug}`)
);

/** Every animated route once, for the no-JavaScript check. */
const STATIC_ROUTES = [...new Set([...GALLERY_ROUTES, ...BREAKDOWN_ROUTES])];

/** Every gallery image, with its painted opacity and translate. */
const imagePaint = (page: Page) =>
	page.evaluate(
		selector =>
			Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
				element => {
					const style = getComputedStyle(element);
					return {
						onScreen: element.getBoundingClientRect().top < window.innerHeight,
						faded: Number(style.opacity) < 1,
						moved: style.translate !== 'none' && style.translate !== '0px',
					};
				}
			),
		IMAGES
	);

/** The images currently faded or lifted — the reveal's hidden state. */
const disturbedImages = async (page: Page) =>
	(await imagePaint(page)).filter(image => image.faded || image.moved).length;

/**
 * Every language row: the language name, the percentage printed beside it (the
 * independent oracle), and the bar's width as a share of its track. The track is
 * the decorative element that wraps the bar.
 */
const barState = (page: Page) =>
	page.evaluate(
		selector =>
			Array.from(
				document.querySelectorAll<HTMLElement>('[data-project-language]')
			).map(row => {
				const track = row.querySelector<HTMLElement>('[data-language-track]');
				const bar = row.querySelector<HTMLElement>(selector);
				const label = Array.from(row.querySelectorAll('span')).find(span =>
					(span.textContent ?? '').includes('%')
				);

				const trackWidth = track?.getBoundingClientRect().width ?? 0;
				const barWidth = bar?.getBoundingClientRect().width ?? 0;

				return {
					name: row.querySelector('span')?.textContent?.trim() ?? '',
					percent: parseFloat(label?.textContent ?? 'NaN'),
					share: trackWidth === 0 ? 0 : (barWidth / trackWidth) * 100,
				};
			}),
		BARS
	);

/** Asserts, without retrying, that every bar is already at its authored share. */
const expectBarsAtAuthoredShareNow = async (page: Page) => {
	const bars = await barState(page);
	expect(bars.length).toBeGreaterThan(0);
	for (const bar of bars) {
		expect(bar.share, `${bar.name} ${bar.percent}%`).toBeCloseTo(
			bar.percent,
			0
		);
	}
};

/** Polls until every bar paints its authored percentage (within half a point). */
const expectBarsAtAuthoredShare = async (page: Page) => {
	await expect
		.poll(
			async () =>
				(await barState(page)).every(
					bar => Math.abs(bar.share - bar.percent) <= 0.5
				),
			{ message: 'every bar should end at its authored percentage' }
		)
		.toBe(true);
};

/**
 * A page where the motion is disabled (reduced motion, or no JavaScript):
 * nothing is hidden or moved, and every bar is already at its authored share.
 */
const expectStatic = async (page: Page) => {
	expect(await disturbedImages(page)).toBe(0);
	if ((await page.locator(BREAKDOWN).count()) > 0) {
		await expectBarsAtAuthoredShareNow(page);
	}
};

/**
 * Settles the page so the layout baseline is final: every image loaded and the
 * web fonts ready. The gallery images are lazy and their markup dimensions do
 * not match every file's intrinsic ratio, so an image would otherwise reflow
 * when scrolled into view — a shift caused by image loading, not by the motion
 * under test.
 */
const settleLayout = async (page: Page) => {
	await page.evaluate(async () => {
		await Promise.all(
			Array.from(document.images).map(async image => {
				image.loading = 'eager';
				await image.decode().catch(() => undefined);
			})
		);
	});
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
};

/** Asserts the breakdown exists on this build; returns its locator either way. */
const breakdownOrSkip = async (page: Page) => {
	const breakdown = page.locator(BREAKDOWN);
	test.skip(
		(await breakdown.count()) === 0,
		'Enrichment was not reached at build; there is no breakdown to animate'
	);
	return breakdown;
};

/**
 * Scrolls each language row into view in order, revealing the whole list. A
 * list taller than the viewport cannot be revealed by scrolling to one spot:
 * rows above and below that spot would stay pending.
 */
const revealAllRows = async (breakdown: Locator) => {
	const rows = breakdown.locator('[data-project-language]');
	for (let index = 0, count = await rows.count(); index < count; index++) {
		await rows.nth(index).scrollIntoViewIfNeeded();
	}
};

/** Navigates to the first repo-backed Project in this Locale with a breakdown. */
const firstBreakdownPath = async (page: Page, prefix: string) => {
	for (const slug of repoSlugs) {
		const path = `${prefix}/projects/${slug}`;
		await page.goto(path);
		if ((await page.locator(BREAKDOWN).count()) > 0) return path;
	}

	return null;
};

test.describe('the gallery joins the scroll reveal', () => {
	for (const path of GALLERY_ROUTES) {
		test(`${path} paints the images on screen at load at full strength`, async ({
			page,
		}) => {
			// The reveal may only hide images below the fold. An image caught
			// mid-reveal while it is on screen is a first-frame bug: it would flash
			// missing content, and on a page too short to scroll it would stay faded.
			// These heights put at least one image on screen, so the check is real.
			for (const height of [800, 1400]) {
				await page.setViewportSize({ width: 1280, height });
				await page.goto(path);

				// Asserted without retrying: a faded image must not pass by fading in.
				const onScreen = (await imagePaint(page)).filter(
					image => image.onScreen
				);
				expect(onScreen.length).toBeGreaterThan(0);
				expect(onScreen.filter(image => image.faded || image.moved)).toEqual(
					[]
				);
			}
		});

		test(`${path} reveals each below-the-fold image as it is scrolled to`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// Which images the browser actually put below the fold — the reveal may
			// hide those and only those, so the test asks the layout rather than
			// assuming an image is off screen.
			const belowFold = (await imagePaint(page)).filter(
				image => !image.onScreen
			);
			expect(belowFold.length).toBeGreaterThan(0);

			// Every below-fold image starts hidden. Asserted before the first scroll:
			// scrolling to one image also brings its neighbours into view.
			await expect.poll(() => disturbedImages(page)).toBe(belowFold.length);

			const last = page.locator(IMAGES).last();
			await last.scrollIntoViewIfNeeded();
			await expect(last).toHaveCSS('opacity', '1');

			// The reveal runs once: scrolling back to the top leaves every image
			// revealed rather than fading it out again.
			await page.evaluate(() => window.scrollTo(0, 0));
			await expect(last).toHaveCSS('opacity', '1');
		});
	}
});

test.describe('the language bars grow into view', () => {
	for (const path of BREAKDOWN_ROUTES) {
		test(`${path} paints a breakdown on screen at load at full width on the first frame`, async ({
			page,
		}) => {
			// Tall enough that the breakdown is on screen at load, where the bars
			// must be at their authored share with no zero-width flash.
			await page.setViewportSize({ width: 1280, height: 1600 });
			await page.goto(path);

			const breakdown = await breakdownOrSkip(page);
			await expect(breakdown).toBeVisible();

			// A Project whose page grew (a long body, a bigger gallery) can push the
			// breakdown below the fold; then there is no first-frame state to check.
			const box = await breakdown.boundingBox();
			test.skip(
				box === null || box.y >= 1600,
				'the breakdown starts below the fold at this height'
			);

			// Asserted without retrying: a zero-width bar must not pass by growing in.
			await expectBarsAtAuthoredShareNow(page);
		});

		test(`${path} grows each bar from zero to its authored share when scrolled to`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			const breakdown = await breakdownOrSkip(page);
			const authored = (await barState(page)).map(bar => bar.percent);
			expect(authored.length).toBeGreaterThan(0);

			// Below the fold, so every bar starts at zero — the breakdown is not
			// visible, and the row keeps its label and percentage.
			await expect
				.poll(async () =>
					(await barState(page)).map(bar => Math.round(bar.share))
				)
				.toEqual(authored.map(() => 0));

			// Scrolled through, every bar grows to its authored percentage.
			await revealAllRows(breakdown);
			await expectBarsAtAuthoredShare(page);

			const grown = await barState(page);
			expect(grown.map(bar => bar.percent)).toEqual(authored);
			for (const bar of grown) {
				expect(bar.share, `${bar.name} ${bar.percent}%`).toBeCloseTo(
					bar.percent,
					0
				);
			}
		});
	}
});

test.describe('the breakdown keeps its content and meaning', () => {
	const REGIONS = LOCALE_PREFIXES.flatMap(prefix =>
		repoSlugs.map(slug => ({
			path: `${prefix}/projects/${slug}`,
			name: prefix === '/ru' ? 'Языки' : 'Languages',
		}))
	);

	for (const { path, name } of REGIONS) {
		test(`${path} labels the region and keeps every language and percentage`, async ({
			page,
		}) => {
			await page.goto(path);
			await breakdownOrSkip(page);

			// The breakdown is a labelled region; the bars themselves are
			// decorative, so the language name and its percentage carry the meaning.
			await expect(page.getByRole('region', { name })).toBeVisible();

			const bars = await barState(page);
			expect(bars.length).toBeGreaterThan(0);
			for (const bar of bars) {
				expect(bar.name.length, 'language name').toBeGreaterThan(0);
				expect(Number.isNaN(bar.percent), 'percentage').toBe(false);
			}
		});
	}
});

test.describe('the motion does not disturb the layout', () => {
	// A phone, where the rows wrap and the images are narrow, and a wide screen,
	// where the content column is at its full width.
	for (const path of BREAKDOWN_ROUTES) {
		for (const width of [360, 1280]) {
			test(`${path} at ${width}px keeps the rows and images in place while they animate`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: 300 });
				await page.goto(path);
				const breakdown = await breakdownOrSkip(page);

				// Settle image loading and the web fonts, so the baseline is the final
				// layout and neither a late font swap nor a lazy image's intrinsic ratio
				// can masquerade as a layout shift.
				await settleLayout(page);

				// Measured from layout offsets, not painted boxes: the reveal lifts an
				// image with `translate` and the bar changes width inside a fixed track,
				// so only the flow geometry can witness a layout shift. `offsetParent`
				// offsets ignore transforms.
				const geometry = () =>
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

						return {
							rows: Array.from(
								document.querySelectorAll<HTMLElement>(
									'[data-project-language]'
								)
							).map(layoutOffset),
							images: Array.from(
								document.querySelectorAll<HTMLElement>('[data-project-image]')
							).map(layoutOffset),
							pageHeight: document.documentElement.scrollHeight,
						};
					});

				// Before the reveal: measured while the breakdown is hidden below the fold.
				const hidden = await geometry();

				await revealAllRows(breakdown);
				await expectBarsAtAuthoredShare(page);

				// After: identical flow geometry — the same rows and images in the same
				// places, and an unchanged page height.
				expect(await geometry()).toEqual(hidden);
			});
		}
	}
});

test.describe('prefers-reduced-motion: reduce', () => {
	test.use({ reducedMotion: 'reduce' });

	for (const path of STATIC_ROUTES) {
		test(`${path} leaves the gallery static and the bars at full width`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// Nothing is hidden or moved, and the bars are at their authored share
			// whether the breakdown is on screen or below it.
			await expectStatic(page);

			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await expectStatic(page);
		});
	}
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	for (const path of STATIC_ROUTES) {
		test(`${path} shows every image and bar at full strength`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			await expectStatic(page);
		});
	}
});

test.describe('print output', () => {
	test('prints the breakdown at full width, not mid-growth', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 375, height: 300 });

		const path = await firstBreakdownPath(page, '/ru');
		test.skip(
			path === null,
			'Enrichment was not reached for any repo-backed Project'
		);
		if (path === null) return;

		await breakdownOrSkip(page);

		// The bars are pending below the fold on screen; paper does not scroll, so
		// the printed breakdown must not inherit that zero-width state.
		await page.emulateMedia({ media: 'print' });
		await expectBarsAtAuthoredShare(page);
	});
});
