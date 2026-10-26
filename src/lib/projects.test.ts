import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import projectOrder from '@/content/projects/order.json';
import {
	coverImage,
	galleryImages,
	orderedProjects,
	projectSchema,
	type ProjectEntry,
	type ProjectFrontmatter,
} from '@/lib/projects';

// The `projects` collection's frontmatter is enforced at build (ADR-0004): a
// mistyped field, or a missing required one, must fail. `summary` and `stack`
// are deliberately optional — Enrichment supplies them. These tests pin the
// rules the markdown files rely on, plus the two behaviours the pages depend on
// — featured-first ordering (ADR-0009) and image selection.
const validProject: ProjectFrontmatter = {
	title: 'Portfolio Site',
	summary: 'A fast, no-flash portfolio built with Astro.',
	stack: ['Astro', 'TypeScript'],
	visibility: 'public',
};

const withProject = (
	id: string,
	overrides: Partial<ProjectFrontmatter> = {}
): ProjectEntry => ({ id, data: { ...validProject, ...overrides } });

describe('projects schema', () => {
	it('accepts a minimal project', () => {
		expect(projectSchema.safeParse(validProject).success).toBe(true);
	});

	it('accepts images, links, featured, and a public GitHub repo', () => {
		const complete = {
			...validProject,
			cover: '/images/cover.png',
			images: ['/images/one.png', '/images/two.png'],
			links: {
				live: 'https://example.com',
				github: 'https://github.com/owner/repo',
				other: 'https://example.com/case-study',
			},
			featured: true,
			githubRepo: 'owner/repo',
		};

		expect(projectSchema.safeParse(complete).success).toBe(true);
	});

	it('accepts a private project without a repo or links', () => {
		expect(
			projectSchema.safeParse({ ...validProject, visibility: 'private' })
				.success
		).toBe(true);
	});

	it('rejects a project missing a required field', () => {
		const { visibility, ...rest } = validProject;

		expect(projectSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects an unknown visibility', () => {
		expect(
			projectSchema.safeParse({ ...validProject, visibility: 'draft' }).success
		).toBe(false);
	});

	// Enrichment fills these in, so authoring neither is valid: the summary
	// becomes the repo's description and the stack falls back to its topics.
	it('accepts an omitted or null summary', () => {
		const { summary, ...rest } = validProject;

		expect(projectSchema.safeParse(rest).success).toBe(true);
		expect(
			projectSchema.safeParse({ ...validProject, summary: null }).success
		).toBe(true);
	});

	it('accepts an omitted stack', () => {
		const { stack, ...rest } = validProject;

		expect(projectSchema.safeParse(rest).success).toBe(true);
	});

	it('rejects a malformed githubRepo', () => {
		for (const githubRepo of ['owner', 'owner/repo/extra', '/repo', '']) {
			expect(
				projectSchema.safeParse({ ...validProject, githubRepo }).success
			).toBe(false);
		}
	});

	// Enrichment only reads public repos, so a private project cannot name one:
	// accepting it would hide a contradiction until a page tried to fetch it.
	it('rejects a githubRepo on a private project', () => {
		expect(
			projectSchema.safeParse({
				...validProject,
				visibility: 'private',
				githubRepo: 'owner/repo',
			}).success
		).toBe(false);
	});
});

// Featured Projects lead the index; the rest follow the authored manifest
// (ADR-0009), so moving a card is one edit to `projects/order.json`.
describe('project ordering', () => {
	const projects = [
		withProject('ru/late', { featured: false }),
		withProject('ru/featured-b', { featured: true }),
		withProject('ru/featured-a', { featured: true }),
		withProject('ru/early', { featured: false }),
	];

	const order = ['early', 'late', 'featured-b', 'featured-a'];

	it('puts featured projects first, then follows the manifest order', () => {
		expect(orderedProjects(projects, order).map(p => p.id)).toEqual([
			'ru/featured-b',
			'ru/featured-a',
			'ru/early',
			'ru/late',
		]);
	});

	it('does not mutate the input', () => {
		orderedProjects(projects, order);

		expect(projects.map(p => p.id)).toEqual([
			'ru/late',
			'ru/featured-b',
			'ru/featured-a',
			'ru/early',
		]);
	});

	it('sorts a slug absent from the manifest after the listed ones', () => {
		expect(
			orderedProjects(
				[withProject('ru/unlisted'), withProject('ru/listed')],
				['listed']
			).map(p => p.id)
		).toEqual(['ru/listed', 'ru/unlisted']);
	});
});

describe('project images', () => {
	it('prefers an explicit cover for the card', () => {
		expect(
			coverImage({
				cover: '/images/cover.png',
				images: ['/images/one.png'],
			})
		).toBe('/images/cover.png');
	});

	it('falls back to the first gallery image when there is no cover', () => {
		expect(coverImage({ images: ['/images/one.png', '/images/two.png'] })).toBe(
			'/images/one.png'
		);
	});

	it('has no cover when the project has no images', () => {
		expect(coverImage({})).toBeNull();
	});

	it('uses the gallery images when authored', () => {
		expect(
			galleryImages({
				cover: '/images/cover.png',
				images: ['/images/one.png', '/images/two.png'],
			})
		).toEqual(['/images/one.png', '/images/two.png']);
	});

	it('falls back to the cover as the single gallery image', () => {
		expect(galleryImages({ cover: '/images/cover.png' })).toEqual([
			'/images/cover.png',
		]);
	});

	it('has an empty gallery when no images are authored', () => {
		expect(galleryImages({})).toEqual([]);
	});
});

// Every Project must be listed: a slug with no manifest entry would silently
// drop to the end of the index, so the manifest and the content files stay in
// step (ADR-0009). Both Locales are checked, and they must pair by slug.
describe('order manifest', () => {
	const slugsIn = (locale: 'ru' | 'en') => {
		const dir = fileURLToPath(
			new URL(`../content/projects/${locale}`, import.meta.url)
		);

		return readdirSync(dir)
			.filter(name => name.endsWith('.md'))
			.map(name => name.replace(/\.md$/, ''));
	};

	it('lists every project slug exactly once', () => {
		expect(new Set(projectOrder)).toEqual(new Set(slugsIn('ru')));
	});

	it('pairs every project across Locales', () => {
		expect(new Set(slugsIn('en'))).toEqual(new Set(slugsIn('ru')));
	});
});
