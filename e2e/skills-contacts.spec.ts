import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * The Skills and Contacts sections (ticket #8). This is the rendered-page seam,
 * so it asserts what a visitor sees: the Resume's skills as grouped chips, the
 * owner's contact links with correct targets, and localized labels — not the
 * internal component structure.
 *
 * The shared, locale-independent data lives in `src/lib/{skills,contacts}.ts`
 * and is pinned by unit tests there; here we prove the labels are translated and
 * the targets land where the data says. Both sections are built to be reused by
 * the home page and the CV page (ticket #10) from that one source.
 */

const contact = (page: Page, kind: string) =>
	page.locator(`[data-contacts-section] [data-contact-kind="${kind}"]`);

const groups = (page: Page) => page.locator('[data-skills-section] [data-skill-group]');

test.describe('the RU home renders skills and contacts', () => {
	test('groups the Resume skills into labelled chips', async ({ page }) => {
		await page.goto('/');

		const section = page.locator('[data-skills-section]');
		await expect(section).toBeVisible();
		await expect(
			section.getByRole('heading', { level: 2, name: 'Навыки' })
		).toBeVisible();

		const all = groups(page);
		expect(await all.count()).toBeGreaterThanOrEqual(1);

		for (const group of await all.all()) {
			await expect(group.getByRole('heading', { level: 3 })).not.toBeEmpty();
			expect(await group.locator('li').count()).toBeGreaterThanOrEqual(1);
		}

		await expect(
			page
				.locator('[data-skill-group-id="languages"]')
				.getByRole('heading', { level: 3 })
		).toHaveText('Языки');
	});

	test('renders every contact link with its correct target and label', async ({
		page,
	}) => {
		await page.goto('/');

		const section = page.locator('[data-contacts-section]');
		await expect(section).toBeVisible();
		await expect(
			section.getByRole('heading', { level: 2, name: 'Контакты' })
		).toBeVisible();

		const expected = [
			['email', 'mailto:kuncovs19@gmail.com', 'Почта'],
			['github', 'https://github.com/SlavaKuntsov', 'GitHub'],
			['telegram', 'https://t.me/slava_kunz', 'Telegram'],
			['instagram', 'https://www.instagram.com/slava_kunz_', 'Instagram'],
		] as const;

		for (const [kind, href, label] of expected) {
			const link = contact(page, kind);
			await expect(link).toHaveAttribute('href', href);
			await expect(link).toContainText(label);
		}
	});

	test('opens the web links in a new tab but keeps email in place', async ({
		page,
	}) => {
		await page.goto('/');

		await expect(contact(page, 'github')).toHaveAttribute('target', '_blank');
		await expect(contact(page, 'telegram')).toHaveAttribute('target', '_blank');
		await expect(contact(page, 'instagram')).toHaveAttribute('target', '_blank');
		await expect(contact(page, 'email')).not.toHaveAttribute('target', '_blank');
	});

	test('offers the Download CV action pointing at the static PDF', async ({
		page,
	}) => {
		await page.goto('/');

		const download = page.locator('[data-cv-download]');
		await expect(download).toHaveAttribute('href', '/resume.pdf');
		await expect(download).toHaveText('Скачать CV');
	});
});

test.describe('the EN home renders skills and contacts in English', () => {
	test('localizes both section headings and the group labels', async ({
		page,
	}) => {
		await page.goto('/en/');

		await expect(
			page.getByRole('heading', { level: 2, name: 'Skills' })
		).toBeVisible();
		await expect(
			page.getByRole('heading', { level: 2, name: 'Contacts' })
		).toBeVisible();
		await expect(
			page
				.locator('[data-skill-group-id="languages"]')
				.getByRole('heading', { level: 3 })
		).toHaveText('Languages');
	});

	test('localizes the contact labels and the CV action', async ({ page }) => {
		await page.goto('/en/');

		await expect(contact(page, 'email')).toContainText('Email');
		await expect(contact(page, 'email')).toHaveAttribute(
			'href',
			'mailto:kuncovs19@gmail.com'
		);
		await expect(page.locator('[data-cv-download]')).toHaveText('Download CV');
	});
});

test('the same contact targets feed the Footer', async ({ page }) => {
	await page.goto('/');

	const footerTelegram = page.locator(
		'footer a[href="https://t.me/slava_kunz"]'
	);
	await expect(footerTelegram).toBeVisible();
});
