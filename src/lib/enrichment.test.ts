import { describe, expect, it } from 'vitest';
import {
	enrichProject,
	enrichProjects,
	fetchRepoMetadata,
	mergeProjectMetadata,
	parseRepoMetadata,
	type FetchLike,
} from '@/lib/enrichment';
import type { ProjectEntry, ProjectFrontmatter } from '@/lib/projects';

// Enrichment (GLOSSARY: *Enrichment*) is optional build-time metadata from a
// public GitHub repo. It is a system boundary — the GitHub API — so the fetch is
// injected and these tests exercise the boundary without touching the network:
// the parsing, the manual-wins merge, the cache, and the guarantee that a
// failure degrades to "no metadata" instead of failing the build.

const repoPayload = {
	stargazers_count: 42,
	language: 'TypeScript',
	description: 'A fast Astro portfolio.',
};

const fakeFetch =
	(payload: unknown, ok = true): FetchLike =>
	async () => ({ ok, json: async () => payload });

const project = (
	overrides: Partial<ProjectFrontmatter> = {}
): ProjectEntry => ({
	id: 'ru/astro-homepage',
	data: {
		title: 'Portfolio Site',
		summary: 'A manual summary that must win.',
		stack: ['Astro'],
		visibility: 'public',
		githubRepo: 'owner/repo',
		...overrides,
	},
});

describe('parseRepoMetadata', () => {
	it('reads the stars, language, and description GitHub reports', () => {
		expect(parseRepoMetadata(repoPayload)).toEqual({
			stars: 42,
			language: 'TypeScript',
			description: 'A fast Astro portfolio.',
		});
	});

	it('tolerates a repo with no language or description', () => {
		expect(
			parseRepoMetadata({
				stargazers_count: 0,
				language: null,
				description: null,
			})
		).toEqual({ stars: 0, language: null, description: null });
	});

	it('rejects a payload without a numeric star count', () => {
		expect(parseRepoMetadata({ language: 'TypeScript' })).toBeNull();
		expect(parseRepoMetadata(null)).toBeNull();
		expect(parseRepoMetadata('not an object')).toBeNull();
	});
});

// Manual fields always win on conflict: the Project's own `summary` is the
// description, while the repo's description is kept as provenance.
describe('mergeProjectMetadata', () => {
	it('keeps the manual summary as the description and surfaces the repo data', () => {
		expect(
			mergeProjectMetadata(
				{ summary: 'Manual summary' },
				{
					stars: 42,
					language: 'TypeScript',
					description: 'The repo description',
				}
			)
		).toEqual({
			stars: 42,
			language: 'TypeScript',
			description: 'Manual summary',
			repoDescription: 'The repo description',
		});
	});

	it('degrades to no metadata while keeping the manual description', () => {
		expect(mergeProjectMetadata({ summary: 'Manual summary' }, null)).toEqual({
			stars: null,
			language: null,
			description: 'Manual summary',
			repoDescription: null,
		});
	});
});

describe('fetchRepoMetadata', () => {
	it('fetches and parses a public repo', async () => {
		await expect(
			fetchRepoMetadata('owner/repo', {
				fetch: fakeFetch(repoPayload),
				cache: new Map(),
			})
		).resolves.toEqual({
			stars: 42,
			language: 'TypeScript',
			description: 'A fast Astro portfolio.',
		});
	});

	it('returns null when GitHub answers with an error status', async () => {
		await expect(
			fetchRepoMetadata('owner/missing', {
				fetch: fakeFetch({}, false),
				cache: new Map(),
			})
		).resolves.toBeNull();
	});

	it('returns null instead of throwing when the request fails', async () => {
		const failing: FetchLike = async () => {
			throw new Error('network down');
		};

		await expect(
			fetchRepoMetadata('owner/repo', { fetch: failing, cache: new Map() })
		).resolves.toBeNull();
	});

	it('reuses the cached result instead of refetching', async () => {
		let calls = 0;
		const fetch: FetchLike = async () => {
			calls += 1;
			return { ok: true, json: async () => repoPayload };
		};
		const cache = new Map();

		await fetchRepoMetadata('owner/repo', { fetch, cache });
		await fetchRepoMetadata('owner/repo', { fetch, cache });

		expect(calls).toBe(1);
	});
});

describe('enrichProject', () => {
	it('enriches a public project that names a repo', async () => {
		const { meta } = await enrichProject(project(), {
			fetch: fakeFetch(repoPayload),
			cache: new Map(),
		});

		expect(meta.stars).toBe(42);
		expect(meta.language).toBe('TypeScript');
	});

	it('does not fetch for a private project', async () => {
		let calls = 0;
		const fetch: FetchLike = async () => {
			calls += 1;
			return { ok: true, json: async () => repoPayload };
		};

		const { meta } = await enrichProject(
			project({ visibility: 'private', githubRepo: undefined }),
			{ fetch, cache: new Map() }
		);

		expect(calls).toBe(0);
		expect(meta).toEqual({
			stars: null,
			language: null,
			description: 'A manual summary that must win.',
			repoDescription: null,
		});
	});

	it('does not fetch for a public project without a repo', async () => {
		let calls = 0;
		const fetch: FetchLike = async () => {
			calls += 1;
			return { ok: true, json: async () => repoPayload };
		};

		await enrichProject(project({ githubRepo: undefined }), {
			fetch,
			cache: new Map(),
		});

		expect(calls).toBe(0);
	});
});

describe('enrichProjects', () => {
	it('enriches every entry, preserving its order', async () => {
		const entries = [
			project({ title: 'One' }),
			project({ title: 'Two', githubRepo: undefined }),
		];

		const enriched = await enrichProjects(entries, {
			fetch: fakeFetch(repoPayload),
			cache: new Map(),
		});

		expect(enriched.map(item => item.entry.data.title)).toEqual([
			'One',
			'Two',
		]);
		expect(enriched[0].meta.stars).toBe(42);
		expect(enriched[1].meta.stars).toBeNull();
	});
});
