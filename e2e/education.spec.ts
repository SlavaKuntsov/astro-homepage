import { expect, test } from './fixtures';

/**
 * Education on the home page, and the print styles (ticket #11). The home page
 * is the Site's CV: the education section sits beside the experience
 * highlights, skills, and contacts, all assembled from content. Print CSS turns
 * any page into a clean document — chrome dropped, light Theme forced, entries
 * kept off page breaks — so the browser's print dialog produces the PDF.
 *
 * The education schema and its helpers are pinned by unit tests
 * (`src/lib/education.test.ts`); here we assert the rendered seam.
 */

test.describe('the RU home renders education', () => {
	test('shows the degree from content', async ({ page }) => {
		await page.goto('/ru/');

		const section = page.locator('[data-education-section]');
		await expect(section).toBeVisible();
		await expect(
			section.getByRole('heading', { level: 2, name: 'Образование' })
		).toBeVisible();

		const entries = section.locator('[data-education-entry]');
		expect(await entries.count()).toBeGreaterThanOrEqual(1);

		const first = entries.first();
		await expect(first.getByRole('heading', { level: 3 })).toContainText(
			'Белорусский государственный технологический университет'
		);
		await expect(first).toContainText('Высшее');
		await expect(first).toContainText('2022 — 2026');
	});
});

test.describe('the EN home renders education', () => {
	test('localizes the heading and the institution', async ({ page }) => {
		await page.goto('/');

		const section = page.locator('[data-education-section]');
		await expect(
			section.getByRole('heading', { level: 2, name: 'Education' })
		).toBeVisible();
		await expect(
			section.locator('[data-education-entry]').first()
		).toContainText('Belarusian State Technological University');
	});
});

test('serves the static resume.pdf the Download CV action targets', async ({
	page,
	request,
}) => {
	await page.goto('/');

	await expect(page.locator('[data-cv-download]')).toHaveAttribute(
		'href',
		'/resume.pdf'
	);

	const pdf = await request.get('/resume.pdf');
	expect(pdf.status()).toBe(200);
	expect(pdf.headers()['content-type']).toContain('application/pdf');
});

test.describe('print output', () => {
	test('hides the site chrome and keeps the CV readable', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ media: 'print' });

		// No navigation, no footer, no interactive actions in the PDF.
		await expect(page.locator('[data-site-header]')).toBeHidden();
		await expect(page.locator('footer')).toBeHidden();
		await expect(page.locator('[data-cv-download]')).toBeHidden();

		// A degree never splits across a page boundary.
		const entry = page.locator('[data-education-entry]').first();
		await expect(entry).toBeVisible();
		expect(await entry.evaluate(el => getComputedStyle(el).breakInside)).toBe(
			'avoid'
		);
	});

	test('forces the light palette even when the screen Theme is dark', async ({
		page,
		seedLocalStorage,
	}) => {
		await seedLocalStorage({ theme: 'dark' });
		await page.goto('/');
		await page.emulateMedia({ media: 'print' });

		// The screen Theme really is dark …
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		// … but paper is white with black text.
		const { background, color } = await page.evaluate(() => {
			const style = getComputedStyle(document.body);
			return { background: style.backgroundColor, color: style.color };
		});
		expect(background).toBe('rgb(255, 255, 255)');
		expect(color).toBe('rgb(0, 0, 0)');
	});
});
