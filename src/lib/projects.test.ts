import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import projectOrder from '@/content/projects/order.json';
import {
	coverImage,
	galleryImages,
	mergeProject,
	orderedProjects,
	projectSchema,
	publishedProjects,
	sharedProjectSchema,
	sharedProjects,
	type MergedProjectEntry,
	type ProjectEntry,
	type ProjectData,
	type ProjectLocalizedFrontmatter,
	type ProjectSharedFrontmatter,
} from '@/lib/projects';

// A Project's frontmatter is enforced at build (ADR-0004): the per-Locale
// markdown holds only `title` and `summary`, while the Locale-independent
// fields live once per slug in `shared.json`. A mistyped field, a missing
// required one, or a shared field left in markdown must fail. `summary` and
// `stack` are deliberately optional — Enrichment supplies them. These tests pin
// those rules, the merge the pages render through, and the two behaviours the
// pages depend on — featured-first ordering (ADR-0009) and image selection.
const localizedProject: ProjectLocalizedFrontmatter = {
	title: 'Portfolio Site',
	summary: 'A fast, no-flash portfolio built with Astro.',
};

const sharedProject: ProjectSharedFrontmatter = {
	stack: ['Astro', 'TypeScript'],
	visibility: 'public',
};

const withProject = (
	id: string,
	overrides: Partial<ProjectData> = {}
): ProjectEntry => ({
	id,
	data: { ...localizedProject, ...sharedProject, ...overrides },
});

describe('projects localized schema', () => {
	it('accepts a title with an optional summary', () => {
		expect(projectSchema.safeParse(localizedProject).success).toBe(true);
		expect(projectSchema.safeParse({ title: 'Flowix' }).success).toBe(true);
	});

	// Enrichment fills these in, so authoring neither is valid: the summary
	// becomes the repo's description and the stack falls back to its topics.
	it('accepts an omitted or null summary', () => {
		expect(
			projectSchema.safeParse({ title: 'Flowix', summary: null }).success
		).toBe(true);
	});

	it('rejects a project missing a title', () => {
		expect(projectSchema.safeParse({ summary: 'A summary' }).success).toBe(
			false
		);
	});

	// Locale-independent fields belong in `shared.json`; leaving one in markdown
	// would let the two Locales drift, so the strict schema rejects it.
	it('rejects shared fields in the localized markdown', () => {
		for (const shared of [
			{ cover: '/images/cover.png' },
			{ images: ['/images/one.png'] },
			{ stack: ['Astro'] },
			{ links: { github: 'https://github.com/owner/repo' } },
			{ visibility: 'public' },
			{ featured: true },
			{ published: false },
			{ githubRepo: 'owner/repo' },
		]) {
			expect(
				projectSchema.safeParse({ ...localizedProject, ...shared }).success
			).toBe(false);
		}
	});
});

describe('projects shared schema', () => {
	it('accepts a minimal shared record', () => {
		expect(sharedProjectSchema.safeParse(sharedProject).success).toBe(true);
	});

	it('accepts images, links, featured, and a public GitHub repo', () => {
		const complete = {
			...sharedProject,
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

		expect(sharedProjectSchema.safeParse(complete).success).toBe(true);
	});

	it('accepts a private project without a repo or links', () => {
		expect(
			sharedProjectSchema.safeParse({ ...sharedProject, visibility: 'private' })
				.success
		).toBe(true);
	});

	it('rejects a shared record missing visibility', () => {
		const { visibility, ...rest } = sharedProject;

		expect(sharedProjectSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects an unknown visibility', () => {
		expect(
			sharedProjectSchema.safeParse({ ...sharedProject, visibility: 'draft' })
				.success
		).toBe(false);
	});

	it('accepts an omitted stack', () => {
		const { stack, ...rest } = sharedProject;

		expect(sharedProjectSchema.safeParse(rest).success).toBe(true);
	});

	// `published` is a display toggle: every existing Project omits it and must
	// keep showing, so the schema supplies the `true` default.
	it('defaults published to true when omitted', () => {
		expect(sharedProjectSchema.parse(sharedProject).published).toBe(true);
	});

	it('accepts an explicit published toggle', () => {
		expect(
			sharedProjectSchema.safeParse({ ...sharedProject, published: false })
				.success
		).toBe(true);
	});

	it('rejects a non-boolean published', () => {
		expect(
			sharedProjectSchema.safeParse({ ...sharedProject, published: 'no' })
				.success
		).toBe(false);
	});

	it('rejects a malformed githubRepo', () => {
		for (const githubRepo of ['owner', 'owner/repo/extra', '/repo', '']) {
			expect(
				sharedProjectSchema.safeParse({ ...sharedProject, githubRepo }).success
			).toBe(false);
		}
	});

	it('rejects an unknown key', () => {
		expect(
			sharedProjectSchema.safeParse({ ...sharedProject, stak: ['Astro'] })
				.success
		).toBe(false);
	});

	// Enrichment only reads public repos, so a private project cannot name one:
	// accepting it would hide a contradiction until a page tried to fetch it.
	it('rejects a githubRepo on a private project', () => {
		expect(
			sharedProjectSchema.safeParse({
				...sharedProject,
				visibility: 'private',
				githubRepo: 'owner/repo',
			}).success
		).toBe(false);
	});
});

// `mergeProject` is how every page sees a Project: the localized entry supplies
// `title`/`summary`, the shared record everything else.
describe('mergeProject', () => {
	it('combines the localized entry with its shared record', () => {
		const merged = mergeProject(
			{ id: 'ru/flowix', data: { title: 'Flowix', summary: null } },
			{
				flowix: {
					cover: '/images/cover.png',
					stack: ['Astro'],
					visibility: 'public',
					featured: true,
				},
			}
		);

		expect(merged).toEqual({
			id: 'ru/flowix',
			data: {
				title: 'Flowix',
				summary: null,
				cover: '/images/cover.png',
				stack: ['Astro'],
				visibility: 'public',
				featured: true,
			},
		});
	});

	it('keeps the localized title and summary', () => {
		const merged: MergedProjectEntry = mergeProject(
			{ id: 'en/flowix', data: localizedProject },
			{ flowix: sharedProject }
		);

		expect(merged.data.title).toBe('Portfolio Site');
		expect(merged.data.summary).toBe(
			'A fast, no-flash portfolio built with Astro.'
		);
	});

	// A missing record means a half-authored Project: fail the build instead of
	// rendering `undefined` fields.
	it('throws when the slug has no shared record', () => {
		expect(() =>
			mergeProject({ id: 'ru/missing', data: { title: 'Missing' } }, {})
		).toThrow(/shared\.json/);
	});
});

// A Project can be kept in the repo but taken off the Site: `published: false`
// drops it from the index and its detail routes in both Locales. Omitted stays
// published, so the toggle is opt-out and existing Projects need no change.
describe('published projects', () => {
	const projects = [
		withProject('ru/default'),
		withProject('ru/live', { published: true }),
		withProject('ru/hidden', { published: false }),
	];

	it('keeps a project whose published flag is omitted', () => {
		expect(publishedProjects(projects).map(p => p.id)).toContain('ru/default');
	});

	it('drops only the projects explicitly unpublished', () => {
		expect(publishedProjects(projects).map(p => p.id)).toEqual([
			'ru/default',
			'ru/live',
		]);
	});

	it('does not mutate the input', () => {
		publishedProjects(projects);

		expect(projects.map(p => p.id)).toEqual([
			'ru/default',
			'ru/live',
			'ru/hidden',
		]);
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
// step (ADR-0009). Both Locales are checked, and they must pair by slug. The
// shared file must cover exactly the authored slugs — no gaps, no strays.
describe('order manifest and shared records', () => {
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

	it('has a shared record for every project slug and no strays', () => {
		expect(new Set(Object.keys(sharedProjects))).toEqual(
			new Set(slugsIn('en'))
		);
	});
});
