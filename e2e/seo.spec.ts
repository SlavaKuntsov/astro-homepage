import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { coverOf, coverSlugs } from './project-data';

/**
 * Per-page, per-Locale metadata (ticket #13, spec user story 23, ADR-0011).
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
	/** The Locale the route renders in (ADR-0011). */
	locale: 'ru' | 'en';
	/** The RU counterpart path (used for the hreflang `ru` link). */
	ruPath: string;
	/** The EN counterpart path (used for the hreflang `en`/`x-default` links). */
	enPath: string;
	title: string;
	description: string;
	/** The page's `og:type`; defaults to `website`. */
	ogType?: 'website' | 'article';
}

const SITE_NAME = { ru: 'Кунцов Святослав', en: 'Sviataslau Kuntsou' } as const;

const PAGES: ExpectedPage[] = [
	{
		path: '/',
		locale: 'en',
		ruPath: '/ru',
		enPath: '/',
		title: 'Sviataslau Kuntsou — Software Developer',
		description:
			"Sviataslau Kuntsou's personal site and resume: software development experience, selected projects, and contacts.",
	},
	{
		path: '/ru/',
		locale: 'ru',
		ruPath: '/ru',
		enPath: '/',
		title: 'Кунцов Святослав — Разработчик ПО',
		description:
			'Персональный сайт и резюме Кунцова Святослава: опыт разработки программного обеспечения, избранные проекты и контакты.',
	},
	{
		path: '/experience',
		locale: 'en',
		ruPath: '/ru/experience',
		enPath: '/experience',
		title: 'Experience — Sviataslau Kuntsou',
		description:
			"Sviataslau Kuntsou's professional experience: companies, roles, technologies, and key achievements.",
	},
	{
		path: '/ru/experience',
		locale: 'ru',
		ruPath: '/ru/experience',
		enPath: '/experience',
		title: 'Опыт работы — Кунцов Святослав',
		description:
			'Профессиональный опыт Кунцова Святослава: компании, роли, технологии и ключевые достижения.',
	},
	{
		path: '/projects',
		locale: 'en',
		ruPath: '/ru/projects',
		enPath: '/projects',
		title: 'Projects — Sviataslau Kuntsou',
		description:
			'Selected projects by Sviataslau Kuntsou: description, technology stack, and source links.',
	},
	{
		path: '/ru/projects',
		locale: 'ru',
		ruPath: '/ru/projects',
		enPath: '/projects',
		title: 'Проекты — Кунцов Святослав',
		description:
			'Избранные проекты Кунцова Святослава: описание, стек технологий и ссылки на исходный код.',
	},
	{
		path: '/arts',
		locale: 'en',
		ruPath: '/ru/arts',
		enPath: '/arts',
		title: 'Arts — Sviataslau Kuntsou',
		description: 'A gallery of artwork by Sviataslau Kuntsou.',
	},
	{
		path: '/ru/arts',
		locale: 'ru',
		ruPath: '/ru/arts',
		enPath: '/arts',
		title: 'Арты — Кунцов Святослав',
		description: 'Галерея художественных работ Кунцова Святослава.',
	},
	// A Project detail page is derived from the index; see the dedicated
	// scenario below. Keeping it out of this static list means adding, removing,
	// renaming, or reordering Projects never edits this file.
];

const meta = (page: Page, selector: string) =>
	page.locator(selector).getAttribute('content');

/** The normalized pathname of an absolute URL (trailing slashes ignored). */
const pathOf = (href: string | null) => {
	expect(href).toBeTruthy();
	return new URL(href as string).pathname.replace(/\/+$/, '') || '/';
};

test.describe('per-page metadata', () => {
	for (const expected of PAGES) {
		test(`${expected.path} emits title, description, canonical, OG and Twitter`, async ({
			page,
		}) => {
			const response = await page.goto(expected.path);
			expect(response?.status()).toBe(200);

			const { locale } = expected;

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
			expect(pathOf(await alternate('x-default'))).toBe(expected.enPath);

			// Open Graph.
			expect(await meta(page, 'meta[property="og:type"]')).toBe(
				expected.ogType ?? 'website'
			);
			expect(await meta(page, 'meta[property="og:site_name"]')).toBe(
				SITE_NAME[locale]
			);
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

	// A Project detail page is derived from whichever Project the index leads
	// with, so adding, removing, renaming, or reordering Projects never edits
	// this file. Its description can come from live Enrichment, so only presence
	// and consistency across the description tags is asserted.
	for (const { base, locale } of [
		{ base: '/projects', locale: 'en' as const },
		{ base: '/ru/projects', locale: 'ru' as const },
	]) {
		test(`${base}/<slug> emits a Project detail page's metadata`, async ({
			page,
		}) => {
			await page.goto(base);

			const card = page.locator('[data-project]').first();
			test.skip((await card.count()) === 0, 'the index lists no Projects');

			const slug = (await card.getAttribute('data-slug')) ?? '';
			const title = (
				await card.getByRole('heading', { level: 2 }).innerText()
			).trim();
			const path = `${base}/${slug}`;
			const expectedTitle = `${title} — ${SITE_NAME[locale]}`;

			const response = await page.goto(path);
			expect(response?.status()).toBe(200);

			await expect(page).toHaveTitle(expectedTitle);

			const description = await meta(page, 'meta[name="description"]');
			expect(description).toBeTruthy();
			expect(await meta(page, 'meta[property="og:description"]')).toBe(
				description
			);
			expect(await meta(page, 'meta[name="twitter:description"]')).toBe(
				description
			);

			const canonical = await page
				.locator('link[rel="canonical"]')
				.getAttribute('href');
			expect(pathOf(canonical)).toBe(path);

			const alternate = (hreflang: string) =>
				page
					.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)
					.getAttribute('href');
			expect(pathOf(await alternate('ru'))).toBe(`/ru/projects/${slug}`);
			expect(pathOf(await alternate('en'))).toBe(`/projects/${slug}`);
			expect(pathOf(await alternate('x-default'))).toBe(`/projects/${slug}`);

			expect(await meta(page, 'meta[property="og:type"]')).toBe('article');
			expect(await meta(page, 'meta[property="og:site_name"]')).toBe(
				SITE_NAME[locale]
			);
			expect(await meta(page, 'meta[property="og:title"]')).toBe(expectedTitle);
			expect(pathOf(await meta(page, 'meta[property="og:url"]'))).toBe(path);
			expect(await meta(page, 'meta[property="og:locale"]')).toBe(
				locale === 'ru' ? 'ru_RU' : 'en_US'
			);
			expect(await meta(page, 'meta[property="og:locale:alternate"]')).toBe(
				locale === 'ru' ? 'en_US' : 'ru_RU'
			);
			expect(await meta(page, 'meta[name="twitter:card"]')).toBe('summary');
			expect(await meta(page, 'meta[name="twitter:title"]')).toBe(
				expectedTitle
			);

			// A Project with a cover shares that cover; otherwise the Site image.
			const cover = coverOf(slug);
			if (cover !== undefined) {
				const expected = cover.startsWith('http') ? cover : `${ORIGIN}${cover}`;
				expect(await meta(page, 'meta[property="og:image"]')).toBe(expected);
				expect(await meta(page, 'meta[name="twitter:image"]')).toBe(expected);
			}
		});
	}

	test('every page carries exactly one canonical link', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
	});

	// The alternates name the counterpart pages' canonical URLs, so on the
	// default-Locale (EN) page the `en`/`x-default` alternate is byte-for-byte
	// this page's canonical.
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

	// A Project detail page shares the Project's cover, not the Site image.
	test('a Project detail page shares the Project cover', async ({ page }) => {
		const slug = coverSlugs[0];
		test.skip(slug === undefined, 'no published Project authors a cover');
		if (slug === undefined) return;

		const cover = coverOf(slug);
		if (cover === undefined) return;
		const expected = cover.startsWith('http') ? cover : `${ORIGIN}${cover}`;

		await page.goto(`/projects/${slug}`);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			expected
		);
		await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
			'content',
			expected
		);
	});
});

/**
 * The crawler surface: a sitemap index, its chunk, and robots.txt, all built
 * from the one real origin; plus the favicon every page links. Redirects
 * (`/works`, `/ru/works`) are not canonical pages and must stay out of the
 * sitemap.
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
		// Sitemap URLs carry Astro's directory-format trailing slash. EN is the
		// default Locale at the root, RU under `/ru/`.
		expect(body).toContain(`<loc>${ORIGIN}/projects/</loc>`);
		expect(body).toContain(`<loc>${ORIGIN}/ru/projects/</loc>`);
		// Each URL names its ru/en counterpart with the same hreflang values the
		// page `<head>` emits.
		expect(body).toContain(`hreflang="en" href="${ORIGIN}/projects/"`);
		expect(body).toContain(`hreflang="ru" href="${ORIGIN}/ru/projects/"`);

		// Redirects are not canonical pages.
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
