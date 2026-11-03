import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The home page's scroll reveal (ticket #30). This is the rendered-page seam, so
 * it asserts what a visitor sees: the content sections below the hero fade and
 * rise into place as they are scrolled to, sections already on screen at load
 * are painted at full strength on the first frame, and the hero — the carousel,
 * greeting, name, and avatar — is never hidden, faded, or moved, because a faded
 * or shifted hero reads as a first-load defect of the same family as the Flash.
 *
 * The reveal is a shared, Site-wide capability (`e2e/reveal.spec.ts`, ticket
 * #28); this file pins only the home page's use of it. Tests observe the
 * sections a visitor sees, never the mechanism's private attributes.
 */

const LOCALES = ['/', '/ru/'] as const;

/**
 * The home page's content sections, in the order they are authored. Each is
 * named once, so the order assertion and the reveal assertions cannot drift.
 */
const SECTIONS = [
	{ name: 'About', selector: '[data-about-section]' },
	{ name: 'Experience highlights', selector: '[data-experience-highlights]' },
	{ name: 'Education', selector: '[data-education-section]' },
	{ name: 'Skills', selector: '[data-skills-section]' },
	{ name: 'Contacts', selector: '[data-contacts-section]' },
] as const;

const SECTION_SELECTORS = SECTIONS.map(section => section.selector);

/** The hero: the parts of the first screen the reveal must never touch. */
const HERO = [
	'[data-arts-carousel]',
	'h1',
	'[data-hero-pitch]',
	'[data-hero-position]',
	'[data-avatar]',
] as const;

/** The computed opacity and translate of every matching element. */
const paintOf = (page: Page, selectors: readonly string[]) =>
	page.evaluate(
		list =>
			list.map(selector =>
				Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
					element => {
						const style = getComputedStyle(element);
						return {
							selector,
							opacity: Number(style.opacity),
							translate: style.translate,
						};
					}
				)
			),
		selectors
	);

/**
 * The matching sections that are faded or lifted — the reveal's hidden state,
 * read from what is painted rather than from the mechanism's private
 * attributes. Zero is what a visitor must always see: on the sections already
 * on screen at load (`onScreenOnly`), and under a media or motion preference
 * that must disable the reveal entirely.
 */
const disturbedOf = (
	page: Page,
	selectors: readonly string[],
	{ onScreenOnly = false } = {}
) =>
	page.evaluate(
		({ list, onScreen }) =>
			Array.from(document.querySelectorAll<HTMLElement>(list.join(',')))
				.filter(
					element =>
						!onScreen ||
						element.getBoundingClientRect().top < window.innerHeight
				)
				.filter(element => {
					const style = getComputedStyle(element);
					return (
						Number(style.opacity) < 1 ||
						(style.translate !== 'none' && style.translate !== '0px')
					);
				}).length,
		{ list: selectors, onScreen: onScreenOnly }
	);

/** The hero must be painted at full strength in its final position. */
const expectHeroUntouched = async (page: Page) => {
	for (const elements of await paintOf(page, HERO)) {
		for (const element of elements) {
			expect(element.opacity, element.selector).toBe(1);
			expect(element.translate, element.selector).toBe('none');
		}
	}
};

test.describe('the hero is never touched by the reveal', () => {
	for (const path of LOCALES) {
		for (const height of [400, 800]) {
			test(`${path} paints the hero at full strength on the first frame (${height}px)`, async ({
				page,
			}) => {
				// At 400px the hero itself reaches below the fold. The reveal starts
				// with the content below it, so even there the hero is untouched.
				await page.setViewportSize({ width: 1280, height });
				await page.goto(path);

				// Asserted without retrying: a faded or shifted hero must not pass by
				// animating into place.
				await expectHeroUntouched(page);
			});
		}
	}
});

test.describe('the content sections reveal below the hero', () => {
	for (const path of LOCALES) {
		test(`${path} paints the sections on screen at load at full strength`, async ({
			page,
		}) => {
			// The reveal may only hide sections below the fold. A section caught
			// mid-reveal while it is on screen is a first-frame bug: it would flash
			// missing content, and on a page too short to scroll it would stay faded.
			for (const height of [400, 800, 1400]) {
				await page.setViewportSize({ width: 1280, height });
				await page.goto(path);

				// Asserted without retrying: a faded section must not pass by fading in.
				expect(
					await disturbedOf(page, SECTION_SELECTORS, { onScreenOnly: true })
				).toBe(0);
			}
		});

		test(`${path} fades each below-the-fold section in as it is scrolled to`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			// Which sections the browser actually put below the fold — the reveal
			// may hide those and only those, so the test asks the layout rather
			// than assuming a section is off screen.
			const belowFold = await page.evaluate(
				selectors =>
					selectors.filter(selector => {
						const element = document.querySelector<HTMLElement>(selector);
						return (
							element !== null &&
							element.getBoundingClientRect().top > window.innerHeight
						);
					}),
				SECTION_SELECTORS
			);
			expect(belowFold.length).toBeGreaterThan(0);

			// Every section the browser put below the fold starts hidden. Asserted
			// before the first scroll: scrolling to one section also brings its
			// neighbours into view (they share one observer), so the hidden state
			// can only be observed up front.
			for (const selector of belowFold) {
				await expect(page.locator(selector), selector).toHaveCSS(
					'opacity',
					'0'
				);
			}

			for (const selector of belowFold) {
				const section = page.locator(selector);

				// Scrolled to, so it fades into place.
				await section.scrollIntoViewIfNeeded();
				await expect(section, selector).toHaveCSS('opacity', '1');
			}

			// The reveal runs once: scrolling back to the top leaves every section
			// revealed rather than fading them out again.
			await page.evaluate(() => window.scrollTo(0, 0));
			for (const selector of belowFold) {
				await expect(page.locator(selector), selector).toHaveCSS(
					'opacity',
					'1'
				);
			}
		});
	}
});

test.describe('the reveal does not disturb the layout', () => {
	for (const path of LOCALES) {
		test(`${path} leaves the sections where they were and wraps the chips the same`, async ({
			page,
		}) => {
			// A phone is where the chips actually wrap, so it is where a reveal that
			// moved or clipped them would show.
			await page.setViewportSize({ width: 360, height: 300 });
			await page.goto(path);

			const section = page.locator('[data-skills-section]');

			// The section really is below the fold and hidden, so the comparison
			// below is a test of the reveal and not of an untouched section.
			await expect(section).toHaveCSS('opacity', '0');

			// Measured from layout offsets, not painted boxes: the reveal lifts a
			// section with `translate`, which moves a painted box on purpose, so
			// only the flow geometry can witness a layout shift. `offsetParent`
			// offsets ignore transforms, which is exactly what this must see.
			const geometry = () =>
				page.evaluate(selectors => {
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
						// Where each section band sits in the flow, top to bottom.
						sections: selectors.map(selector => ({
							selector,
							...layoutOffset(document.querySelector<HTMLElement>(selector)!),
						})),
						// Every chip: a re-wrap or a clipped chip changes these.
						chips: Array.from(
							document.querySelectorAll<HTMLElement>(
								'[data-skills-section] [data-skill-group] li'
							)
						).map(chip => ({
							...layoutOffset(chip),
							width: Math.round(chip.getBoundingClientRect().width),
						})),
						// The widest chip must still fit the content column.
						widest: Math.round(
							Math.max(
								...Array.from(
									document.querySelectorAll<HTMLElement>(
										'[data-skills-section] [data-skill-group] li'
									)
								).map(chip => chip.getBoundingClientRect().width)
							)
						),
						column: Math.round(
							document
								.querySelector('[data-content-column]')!
								.getBoundingClientRect().width
						),
						overflow:
							document.querySelector('[data-skills-section]')!.scrollWidth -
							document.querySelector('[data-skills-section]')!.clientWidth,
						pageHeight: document.documentElement.scrollHeight,
					};
				}, SECTION_SELECTORS);

			// Before the reveal: measured while the section is still hidden below the
			// fold. Nothing is clipped and every chip is inside the column.
			const hidden = await geometry();
			expect(hidden.overflow).toBeLessThanOrEqual(1);
			expect(hidden.widest).toBeLessThanOrEqual(hidden.column);
			expect(hidden.sections.every(section => section.top > 0)).toBe(true);

			await section.scrollIntoViewIfNeeded();
			await expect(section).toHaveCSS('opacity', '1');

			// After the reveal: identical flow geometry — the same sections in the
			// same places, the same chips on the same rows, and an unchanged page
			// height, so nothing below the lifted section was pushed or pulled.
			expect(await geometry()).toEqual(hidden);
		});
	}
});

test.describe('the home page keeps its content and order', () => {
	// The heading each section must render, per Locale: the independent oracle
	// for "all rendered content are unchanged" — not a self-derived count.
	const HEADINGS: Record<string, readonly string[]> = {
		'/': ['About Me', 'Career highlights', 'Education', 'Skills', 'Contacts'],
		'/ru/': [
			'Обо Мне',
			'Ключевые достижения',
			'Образование',
			'Навыки',
			'Контакты',
		],
	};

	for (const path of LOCALES) {
		test(`${path} renders the sections in the authored order`, async ({
			page,
		}) => {
			await page.goto(path);

			// The reveal restructured the page (a container below the hero), so the
			// order and the content of the sections must be provably unchanged.
			const rendered = await page.evaluate(
				sections =>
					sections.map(section => {
						const element = document.querySelector<HTMLElement>(
							section.selector
						);
						return {
							selector: section.selector,
							top: element
								? Math.round(
										element.getBoundingClientRect().top + window.scrollY
									)
								: -1,
							heading:
								element?.querySelector('h2, h1')?.textContent?.trim() ??
								'(none)',
							text: element?.textContent?.trim().length ?? 0,
						};
					}),
				SECTIONS
			);

			// Authored order, top to bottom on the page.
			expect(rendered.map(section => section.selector)).toEqual([
				...SECTION_SELECTORS,
			]);
			expect(rendered.map(section => section.top)).toEqual(
				[...rendered.map(section => section.top)].sort((a, b) => a - b)
			);

			// The headings are the Locale's own words, so the content is checked
			// against the translations and not merely against being non-empty.
			expect(rendered.map(section => section.heading)).toEqual(HEADINGS[path]);
			for (const section of rendered) {
				expect(section.text, section.selector).toBeGreaterThan(0);
			}
		});
	}
});

test.describe('the reveal re-binds after client-side navigation', () => {
	test('the home hero is untouched and the sections reveal on the new page', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 300 });
		await page.goto('/arts');

		// A client-side navigation replaces the page content, so the mechanism
		// must bind the home page's (new) sections.
		await page.locator('header nav a[href="/"]').first().click();
		await page.waitForURL(url => url.pathname === '/');

		// The hero arrives at full strength, never mid-reveal.
		await expectHeroUntouched(page);

		const contacts = page.locator('[data-contacts-section]');
		await expect(contacts).toHaveCSS('opacity', '0');
		await contacts.scrollIntoViewIfNeeded();
		await expect(contacts).toHaveCSS('opacity', '1');
	});
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
			expect(await disturbedOf(page, SECTION_SELECTORS)).toBe(0);

			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			expect(await disturbedOf(page, SECTION_SELECTORS)).toBe(0);
		});
	}
});

test.describe('print output', () => {
	test('keeps every CV section at full strength on paper', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 300 });
		await page.goto('/');

		// The reveal hides the sections below the fold on screen; paper does not
		// scroll, so the printed CV must not inherit that hidden state.
		await page.emulateMedia({ media: 'print' });

		expect(await disturbedOf(page, SECTION_SELECTORS)).toBe(0);
	});
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	for (const path of LOCALES) {
		test(`${path} renders every section visible`, async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 300 });
			await page.goto(path);

			expect(await disturbedOf(page, SECTION_SELECTORS)).toBe(0);
		});
	}
});
