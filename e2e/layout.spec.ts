import { expect, test } from './fixtures';

/**
 * The shared shell (ticket #5): every page renders the same header, main
 * container, and footer from one layout, the header/footer survive View
 * Transitions, fonts preload with the right MIME type without shifting the
 * layout, and the mobile menu works below the `md` breakpoint.
 */

const ROUTES = ['/', '/works', '/arts', '/ru/', '/ru/works', '/ru/arts'];

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

test.describe('fonts', () => {
	test('preload with a woff2 MIME type and apply the intended families', async ({
		page,
	}) => {
		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);

		const preloads = await page
			.locator('link[rel="preload"][as="font"]')
			.evaluateAll(links => links.map(link => link.getAttribute('type') ?? ''));

		expect(preloads.length).toBeGreaterThan(0);
		for (const type of preloads) {
			expect(type).toBe('font/woff2');
		}

		expect(await page.evaluate(() => document.fonts.check('16px Inter'))).toBe(
			true
		);
		expect(
			await page.evaluate(() => document.fonts.check('600 24px Comfortaa'))
		).toBe(true);

		const bodyFamily = await page.evaluate(
			() => getComputedStyle(document.body).fontFamily
		);
		const headingFamily = await page.evaluate(
			() => getComputedStyle(document.querySelector('h1')!).fontFamily
		);

		expect(bodyFamily).toContain('Inter');
		expect(headingFamily).toContain('Comfortaa');
	});

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
