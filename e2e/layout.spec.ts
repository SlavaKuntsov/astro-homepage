import { expect, test } from './fixtures';

/**
 * The shared shell (ticket #5): every page renders the same header, main
 * container, and footer from one layout, the header/footer survive View
 * Transitions, fonts preload with the right MIME type without shifting the
 * layout, and the mobile menu works below the `md` breakpoint.
 */

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

test.describe('the shared layout renders on every page', () => {
	for (const path of ROUTES) {
		test(`${path} has a header, a main container, and a footer`, async ({
			page,
		}) => {
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);

			await expect(page.getByRole('banner')).toBeVisible();
			await expect(page.getByRole('main')).toBeVisible();
			await expect(page.getByRole('contentinfo')).toBeVisible();
		});
	}
});

/**
 * The shell geometry (ticket #23): the chrome band — the Header and Footer
 * content — is the same capped width on every page and Locale, strictly wider
 * than the one content column at `<main>` but narrower than the viewport. Both
 * widths are design tokens, so the numbers asserted here are their rendered
 * border-box values (56rem = 896px, 48rem = 768px); the standard gutter lives
 * inside them.
 */
test.describe('the shell geometry', () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	const CHROME_BAND = 896;
	const CONTENT_COLUMN = 768;

	for (const path of ['/', '/ru/']) {
		test(`${path} frames the content column with equal, capped chrome bands`, async ({
			page,
		}) => {
			await page.goto(path);

			const geometry = await page.evaluate(() => {
				const widthOf = (selector: string) => {
					const element = document.querySelector(selector);
					if (!element) throw new Error(`Missing ${selector}`);
					return element.getBoundingClientRect().width;
				};

				return {
					header: widthOf('header [data-chrome-band]'),
					footer: widthOf('footer [data-chrome-band]'),
					content: widthOf('[data-content-column]'),
					viewport: window.innerWidth,
				};
			});

			// One capped band: equal top and bottom, narrower than the viewport.
			expect(geometry.header).toBeCloseTo(CHROME_BAND, 0);
			expect(geometry.footer).toBeCloseTo(CHROME_BAND, 0);
			expect(geometry.header).toBe(geometry.footer);
			expect(geometry.header).toBeLessThan(geometry.viewport);

			// The content column is narrower still, and sits inside the band.
			expect(geometry.content).toBeCloseTo(CONTENT_COLUMN, 0);
			expect(geometry.content).toBeLessThan(geometry.header);
		});
	}

	test('the section headings align with the content column', async ({
		page,
	}) => {
		for (const path of ['/projects', '/arts', '/ru/projects', '/ru/arts']) {
			await page.goto(path);

			const { heading, columnContent } = await page.evaluate(() => {
				const column = document.querySelector('[data-content-column]');
				const h1 = document.querySelector('main h1');
				if (!column || !h1)
					throw new Error('Missing the column or its heading');

				// The column's padding box is where its content starts; the
				// heading must share that left edge (as the home content does).
				const paddingLeft = parseFloat(getComputedStyle(column).paddingLeft);

				return {
					heading: h1.getBoundingClientRect().left,
					columnContent: column.getBoundingClientRect().left + paddingLeft,
				};
			});

			expect(heading).toBeCloseTo(columnContent, 0);
		}
	});

	test.describe('below the cap', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('every band fills the viewport with the standard gutter', async ({
			page,
		}) => {
			await page.goto('/');

			const geometry = await page.evaluate(() => {
				const widthOf = (selector: string) => {
					const element = document.querySelector(selector);
					if (!element) throw new Error(`Missing ${selector}`);
					return element.getBoundingClientRect().width;
				};
				const column = document.querySelector('[data-content-column]');
				if (!column) throw new Error('Missing [data-content-column]');
				const style = getComputedStyle(column);

				return {
					header: widthOf('header [data-chrome-band]'),
					footer: widthOf('footer [data-chrome-band]'),
					content: widthOf('[data-content-column]'),
					viewport: window.innerWidth,
					gutter:
						parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
				};
			});

			// No cap is reached at this width: every band spans the viewport and
			// the gutter is still applied inside it.
			expect(geometry.header).toBeCloseTo(geometry.viewport, 0);
			expect(geometry.footer).toBeCloseTo(geometry.viewport, 0);
			expect(geometry.content).toBeCloseTo(geometry.viewport, 0);
			expect(geometry.gutter).toBeGreaterThan(0);
		});
	});
});

test('the header and footer survive a View Transition', async ({ page }) => {
	await page.goto('/');

	// A full page load would drop these markers; a persisted element keeps them.
	await page.evaluate(() => {
		document.querySelector('header')?.setAttribute('data-persisted', 'header');
		document.querySelector('footer')?.setAttribute('data-persisted', 'footer');
	});

	await page.locator('header nav a[href$="/arts"]').first().click();
	await page.waitForURL('**/arts');

	await expect(page.locator('header')).toHaveAttribute(
		'data-persisted',
		'header'
	);
	await expect(page.locator('footer')).toHaveAttribute(
		'data-persisted',
		'footer'
	);
});

test('cross-Locale navigation replaces the persisted chrome', async ({
	page,
}) => {
	await page.goto('/ru');

	await page.evaluate(() => {
		(window as unknown as { __clientNavigation: boolean }).__clientNavigation =
			true;
		document.querySelector('header')?.setAttribute('data-persisted', 'old');
	});

	// The server-rendered switcher is a same-origin link the ClientRouter
	// intercepts, so the swap happens client-side.
	await page.locator('[data-locale-switcher]').first().click();
	await page.waitForURL(
		url => (url.pathname.replace(/\/+$/, '') || '/') === '/'
	);

	// The window survives a client-side navigation, so this also proves the
	// router (not a full reload) performed the swap.
	expect(
		await page.evaluate(
			() =>
				(window as unknown as { __clientNavigation?: boolean })
					.__clientNavigation
		)
	).toBe(true);

	// The persist key is Locale-scoped, so the old Header must not survive: its
	// labels are now the wrong Locale.
	await expect(page.locator('header')).not.toHaveAttribute(
		'data-persisted',
		'old'
	);
	await expect(page.getByRole('navigation').first()).toContainText('Home');
	await expect(page.locator('[data-theme-toggle]')).toHaveAttribute(
		'aria-label',
		'Switch to dark theme'
	);
});

test.describe('fonts', () => {
	for (const path of ['/', '/ru/']) {
		test(`${path} preloads only its woff2 subsets and applies the families`, async ({
			page,
		}) => {
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);

			const lang = await page.locator('html').getAttribute('lang');
			const preloads = await page
				.locator('link[rel="preload"][as="font"]')
				.evaluateAll(links =>
					links.map(link => link.getAttribute('type') ?? '')
				);

			// Two families × one normal face for EN; plus the Cyrillic faces for
			// RU. The home greeting's <i> run adds one Inter italic face per
			// subset, so it paints in the right face from the first frame.
			expect(preloads).toHaveLength(lang === 'ru' ? 6 : 3);
			for (const type of preloads) {
				expect(type).toBe('font/woff2');
			}

			const faces = await page.evaluate(() =>
				Array.from(document.fonts).map(face => ({
					family: face.family,
					status: face.status,
					unicodeRange: face.unicodeRange,
				}))
			);
			const loaded = faces.filter(face => face.status === 'loaded');

			expect(loaded.some(face => face.family.startsWith('Comfortaa'))).toBe(
				true
			);
			expect(loaded.some(face => face.family.startsWith('Inter'))).toBe(true);

			// The RU page paints Cyrillic, so its Cyrillic subsets must load too.
			expect(loaded.some(face => /U\+0?400/i.test(face.unicodeRange))).toBe(
				lang === 'ru'
			);

			const bodyFamily = await page.evaluate(
				() => getComputedStyle(document.body).fontFamily
			);
			const headingFamily = await page.evaluate(
				() => getComputedStyle(document.querySelector('h1')!).fontFamily
			);

			expect(bodyFamily).toContain('Inter');
			expect(headingFamily).toContain('Comfortaa');
		});
	}

	test('do not shift the layout when they load', async ({ page }) => {
		await page.addInitScript(() => {
			const state = { cls: 0 };
			(window as unknown as { __cls: typeof state }).__cls = state;

			new PerformanceObserver(list => {
				for (const entry of list.getEntries()) {
					const shift = entry as PerformanceEntry & {
						hadRecentInput: boolean;
						value: number;
					};
					if (!shift.hadRecentInput) state.cls += shift.value;
				}
			}).observe({ type: 'layout-shift', buffered: true });
		});

		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);
		// Two frames after the fonts settle, so any font-driven shift has fired.
		await page.evaluate(
			() =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				)
		);

		const cls = await page.evaluate(
			() => (window as unknown as { __cls: { cls: number } }).__cls.cls
		);

		expect(cls).toBeLessThan(0.05);
	});
});

test.describe('the mobile menu', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('opens below md and closes after navigating', async ({ page }) => {
		await page.goto('/');

		// At this width the desktop nav is display:none, so the trigger is the
		// only way into the menu.
		await expect(page.locator('header nav').first()).toBeHidden();
		await expect(page.locator('[data-mobile-menu-trigger]')).toBeVisible();

		await page.locator('[data-mobile-menu-trigger]').click();

		const mobileNav = page.getByRole('navigation');
		await expect(mobileNav).toBeVisible();

		await mobileNav.locator('a[href$="/arts"]').click();
		await page.waitForURL('**/arts');

		// A closed <details> removes its navigation from the accessibility tree.
		await expect(page.getByRole('navigation')).toHaveCount(0);
	});

	test('closes on Escape', async ({ page }) => {
		await page.goto('/');

		await page.locator('[data-mobile-menu-trigger]').click();
		await expect(page.getByRole('navigation')).toBeVisible();

		await page.keyboard.press('Escape');

		await expect(page.getByRole('navigation')).toHaveCount(0);
	});
});

test.describe('the mobile menu without JavaScript', () => {
	test.use({
		viewport: { width: 390, height: 844 },
		javaScriptEnabled: false,
	});

	test('opens and navigates through native <details>', async ({ page }) => {
		await page.goto('/');
		await page.locator('[data-mobile-menu-trigger]').click();

		const mobileNav = page.getByRole('navigation');
		await expect(mobileNav).toBeVisible();

		await mobileNav.locator('a[href$="/arts"]').click();
		await page.waitForURL('**/arts');

		await expect(page.getByRole('navigation')).toHaveCount(0);
	});
});

test('the active navigation link follows client-side navigation', async ({
	page,
}) => {
	await page.goto('/');

	const primaryNav = page.getByRole('navigation').first();
	const home = primaryNav.locator('a[href="/"]');
	expect(await home.getAttribute('aria-current')).toBe('page');

	const arts = primaryNav.locator('a[href="/arts"]');
	await arts.click();
	await page.waitForURL('**/arts');

	await expect(arts).toHaveAttribute('aria-current', 'page');
	await expect(home).not.toHaveAttribute('aria-current', 'page');
});

test('the default-Locale root link is active only on the root', async ({
	page,
}) => {
	await page.goto('/projects');

	const primaryNav = page.getByRole('navigation').first();
	const home = primaryNav.locator('a[href="/"]');
	const projects = primaryNav.locator('a[href="/projects"]');

	await expect(projects).toHaveAttribute('aria-current', 'page');
	// The root is not a section: it must not light up on `/projects`.
	await expect(home).not.toHaveAttribute('aria-current', 'page');
});
