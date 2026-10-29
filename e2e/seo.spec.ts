import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Per-page, per-Locale metadata (ticket #13, spec user story 23, ADR-0005).
 * This is the rendered-page seam: it asserts what a crawler or a link preview
 * reads — the title, description, an absolute canonical URL, the ru/en hreflang
 * alternates, and the Open Graph/Twitter tags. The path↔Locale mapping those
 * derive from is pinned by unit tests (`src/lib/seo.test.ts`); here the actual
 * emitted tags are checked.
 */

const ORIGIN = 'https://slava-homepage.vercel.app';

interface ExpectedPage {
	/** The route to visit. */
	path: string;
	/** The RU counterpart path (used for the hreflang `ru`/`x-default` links). */
	ruPath: string;
	/** The EN counterpart path (used for the hreflang `en` link). */
	enPath: string;
	title: string;
	description: string;
}

const PAGES: ExpectedPage[] = [
	{
		path: '/',
		ruPath: '/',
		enPath: '/en',
		title: 'Кунцов Святослав — Разработчик ПО',
		description:
			'Персональный сайт и резюме Кунцова Святослава: опыт разработки программного обеспечения, избранные проекты и контакты.',
	},
	{
		path: '/en/',
		ruPath: '/',
		enPath: '/en',
		title: 'Sviataslau Kuntsou — Software Developer',
		description:
			"Sviataslau Kuntsou's personal site and resume: software development experience, selected projects, and contacts.",
	},
	{
		path: '/experience',
		ruPath: '/experience',
		enPath: '/en/experience',
		title: 'Опыт работы — Кунцов Святослав',
		description:
			'Профессиональный опыт Кунцова Святослава: компании, роли, технологии и ключевые достижения.',
	},
	{
		path: '/en/experience',
		ruPath: '/experience',
		enPath: '/en/experience',
		title: 'Experience — Sviataslau Kuntsou',
		description:
			"Sviataslau Kuntsou's professional experience: companies, roles, technologies, and key achievements.",
	},
	{
		path: '/projects',
		ruPath: '/projects',
		enPath: '/en/projects',
		title: 'Проекты — Кунцов Святослав',
		description:
			'Избранные проекты Кунцова Святослава: описание, стек технологий и ссылки на исходный код.',
	},
	{
		path: '/en/projects',
		ruPath: '/projects',
		enPath: '/en/projects',
		title: 'Projects — Sviataslau Kuntsou',
		description:
			'Selected projects by Sviataslau Kuntsou: description, technology stack, and source links.',
	},
	{
		path: '/arts',
		ruPath: '/arts',
		enPath: '/en/arts',
		title: 'Арты — Кунцов Святослав',
		description: 'Галерея художественных работ Кунцова Святослава.',
	},
	{
		path: '/en/arts',
		ruPath: '/arts',
		enPath: '/en/arts',
		title: 'Arts — Sviataslau Kuntsou',
		description: 'A gallery of artwork by Sviataslau Kuntsou.',
	},
	// A Project detail page (deterministic description: authored `summary`).
	{
		path: '/projects/private-crm',
		ruPath: '/projects/private-crm',
		enPath: '/en/projects/private-crm',
		title: 'CRM для логистики — Кунцов Святослав',
		description:
			'Внутренняя система для диспетчеров: заявки, маршруты и расчёты.',
	},
	{
		path: '/en/projects/private-crm',
		ruPath: '/projects/private-crm',
		enPath: '/en/projects/private-crm',
		title: 'Logistics CRM — Sviataslau Kuntsou',
		description:
			'An internal system for dispatchers covering orders, routes, and billing.',
	},
];

const meta = (page: Page, selector: string) =>
	page.locator(selector).getAttribute('content');

/** The normalized pathname of an absolute URL (trailing slashes ignored). */
const pathOf = (href: string | null) => {
	expect(href).toBeTruthy();
	return new URL(href as string).pathname.replace(/\/+$/, '') || '/';
};

/** ADR-0005: EN lives under `/en/…`; every other route is the default RU. */
const localeOf = (path: string): 'ru' | 'en' =>
	path === '/en' || path.startsWith('/en/') ? 'en' : 'ru';

test.describe('per-page metadata', () => {
	for (const expected of PAGES) {
		test(`${expected.path} emits title, description, canonical, OG and Twitter`, async ({
			page,
		}) => {
			const response = await page.goto(expected.path);
			expect(response?.status()).toBe(200);

			const locale = localeOf(expected.path);
			const siteName =
				locale === 'ru' ? 'Кунцов Святослав' : 'Sviataslau Kuntsou';

			// Primary tags.
			await expect(page).toHaveTitle(expected.title);
			expect(await meta(page, 'meta[name="description"]')).toBe(
				expected.description
			);

			// Canonical: absolute, on the real origin, and this page's path.
			const canonical = await page
				.locator('link[rel="canonical"]')
				.getAttribute('href');
			expect(new URL(canonical as string).origin).toBe(ORIGIN);
			expect(pathOf(canonical)).toBe(expected.path.replace(/\/+$/, '') || '/');

			// hreflang alternates: the ru/en pair of the same page + x-default.
			const alternate = (hreflang: string) =>
				page
					.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)
					.getAttribute('href');
			expect(pathOf(await alternate('ru'))).toBe(expected.ruPath);
			expect(pathOf(await alternate('en'))).toBe(expected.enPath);
			expect(pathOf(await alternate('x-default'))).toBe(expected.ruPath);

			// Open Graph.
			expect(await meta(page, 'meta[property="og:type"]')).toBe('website');
			expect(await meta(page, 'meta[property="og:site_name"]')).toBe(siteName);
			expect(await meta(page, 'meta[property="og:title"]')).toBe(
				expected.title
			);
			expect(await meta(page, 'meta[property="og:description"]')).toBe(
				expected.description
			);
			expect(pathOf(await meta(page, 'meta[property="og:url"]'))).toBe(
				expected.path.replace(/\/+$/, '') || '/'
			);
			expect(
				new URL((await meta(page, 'meta[property="og:image"]')) as string)
					.origin
			).toBe(ORIGIN);
			expect(await meta(page, 'meta[property="og:locale"]')).toBe(
				locale === 'ru' ? 'ru_RU' : 'en_US'
			);
			expect(await meta(page, 'meta[property="og:locale:alternate"]')).toBe(
				locale === 'ru' ? 'en_US' : 'ru_RU'
			);

			// Twitter.
			expect(await meta(page, 'meta[name="twitter:card"]')).toBe('summary');
			expect(await meta(page, 'meta[name="twitter:title"]')).toBe(
				expected.title
			);
			expect(await meta(page, 'meta[name="twitter:description"]')).toBe(
				expected.description
			);
			expect(
				new URL((await meta(page, 'meta[name="twitter:image"]')) as string)
					.origin
			).toBe(ORIGIN);
		});
	}

	test('every page carries exactly one canonical link', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
	});

	// The alternates name the counterpart pages' canonical URLs, so on a RU page
	// the `ru`/`x-default` alternate is byte-for-byte this page's canonical.
	test('the default-Locale alternate equals the page canonical', async ({
		page,
	}) => {
		await page.goto('/projects');

		const canonical = await page
			.locator('link[rel="canonical"]')
			.getAttribute('href');
		await expect(
			page.locator('link[rel="alternate"][hreflang="x-default"]')
		).toHaveAttribute('href', canonical as string);
	});
});

/**
 * The crawler surface: a sitemap index, its chunk, and robots.txt, all built
 * from the one real origin; plus the favicon every page links. Redirects
 * (`/ru/*`, `/works`) are not canonical pages and must stay out of the sitemap.
 */
test.describe('the crawler surface', () => {
	test('serves a sitemap index that points at a sitemap chunk', async ({
		request,
	}) => {
		const response = await request.get('/sitemap-index.xml');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('xml');
		expect(await response.text()).toContain('sitemap-0.xml');
	});

	test('lists each page with its ru/en hreflang alternates', async ({
		request,
	}) => {
		const response = await request.get('/sitemap-0.xml');
		expect(response.status()).toBe(200);

		const body = await response.text();
		// Sitemap URLs carry Astro's directory-format trailing slash.
		expect(body).toContain(`<loc>${ORIGIN}/projects/</loc>`);
		expect(body).toContain(`<loc>${ORIGIN}/en/projects/</loc>`);
		// Each URL names its ru/en counterpart with the same hreflang values the
		// page `<head>` emits.
		expect(body).toContain(`hreflang="en" href="${ORIGIN}/en/projects/"`);
		expect(body).toContain(`hreflang="ru" href="${ORIGIN}/projects/"`);

		// Redirects are not canonical pages.
		expect(body).not.toContain('/ru/');
		expect(body).not.toContain(`${ORIGIN}/works/`);
	});

	test('serves robots.txt naming the sitemap index on the real origin', async ({
		request,
	}) => {
		const response = await request.get('/robots.txt');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('text/plain');

		const body = await response.text();
		expect(body).toContain('User-agent: *');
		expect(body).toContain('Allow: /');
		expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap-index.xml`);
	});

	test('serves the favicon every page links', async ({ request }) => {
		const response = await request.get('/favicon.svg');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('image/svg+xml');
	});
});
