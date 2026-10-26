import { describe, expect, it } from 'vitest';
import {
	enrichProject,
	enrichProjects,
	fetchRepoMetadata,
	mergeProjectMetadata,
	parseLanguages,
	parseRepoMetadata,
	type FetchLike,
} from '@/lib/enrichment';
import type { ProjectEntry, ProjectFrontmatter } from '@/lib/projects';

// Enrichment (GLOSSARY: *Enrichment*) is optional build-time metadata from a
// public GitHub repo. It is a system boundary — the GitHub API — so the fetch is
// injected and these tests exercise the boundary without touching the network:
// the parsing, the topic-tags and language breakdown, the merge, the cache, and
// the guarantee that a failure degrades to "no metadata" instead of failing the
// build.

const repoPayload = {
	stargazers_count: 42,
	language: 'TypeScript',
	description: 'A fast Astro portfolio.',
	topics: ['astro', 'portfolio'],
};

// The bytes GitHub reports for the repo; they total exactly 1000 so the shares
// below are stable to assert.
const languagesPayload = {
	TypeScript: 616,
	Astro: 245,
	Shell: 69,
	CSS: 42,
	JavaScript: 21,
	Makefile: 7,
};

const expectedLanguages = [
	{ name: 'TypeScript', percent: 61.6 },
	{ name: 'Astro', percent: 24.5 },
	{ name: 'Shell', percent: 6.9 },
	{ name: 'CSS', percent: 4.2 },
	{ name: 'JavaScript', percent: 2.1 },
	{ name: 'Makefile', percent: 0.7 },
];

/** A fake GitHub that answers the repo and languages endpoints differently. */
const fakeFetch =
	({
		repo = repoPayload,
		languages = languagesPayload,
		repoOk = true,
		languagesOk = true,
	}: {
		repo?: unknown;
		languages?: unknown;
		repoOk?: boolean;
		languagesOk?: boolean;
	} = {}): FetchLike =>
	async url => {
		const isLanguages = url.endsWith('/languages');
		return {
			ok: isLanguages ? languagesOk : repoOk,
			json: async () => (isLanguages ? languages : repo),
		};
	};

const project = (
	overrides: Partial<ProjectFrontmatter> = {}
): ProjectEntry => ({
	id: 'ru/astro-homepage',
	data: {
		title: 'Portfolio Site',
		summary: 'A manual summary that must win.',
		stack: ['Astro', 'TypeScript'],
		visibility: 'public',
		githubRepo: 'owner/repo',
		...overrides,
	},
});

describe('parseRepoMetadata', () => {
	it('reads the stars, language, description, and topics GitHub reports', () => {
		expect(parseRepoMetadata(repoPayload)).toEqual({
			stars: 42,
			language: 'TypeScript',
			description: 'A fast Astro portfolio.',
			topics: ['astro', 'portfolio'],
		});
	});

	it('tolerates a repo with no language, description, or topics', () => {
		expect(
			parseRepoMetadata({
				stargazers_count: 0,
				language: null,
				description: null,
			})
		).toEqual({
			stars: 0,
			language: null,
			description: null,
			topics: [],
		});
	});

	it('drops non-string topics', () => {
		expect(
			parseRepoMetadata({
				stargazers_count: 1,
				topics: ['astro', 42, '', null],
			})
		).toEqual({
			stars: 1,
			language: null,
			description: null,
			topics: ['astro'],
		});
	});

	it('rejects a payload without a numeric star count', () => {
		expect(parseRepoMetadata({ language: 'TypeScript' })).toBeNull();
		expect(parseRepoMetadata(null)).toBeNull();
		expect(parseRepoMetadata('not an object')).toBeNull();
	});
});

describe('parseLanguages', () => {
	it('turns byte counts into shares, largest first', () => {
		expect(parseLanguages(languagesPayload)).toEqual(expectedLanguages);
	});

	it('rounds to one decimal place', () => {
		// 2 of 3 bytes is 66.6…%, shown as 66.7%.
		expect(parseLanguages({ TypeScript: 2, Astro: 1 })).toEqual([
			{ name: 'TypeScript', percent: 66.7 },
			{ name: 'Astro', percent: 33.3 },
		]);
	});

	it('returns nothing for an empty or malformed payload', () => {
		expect(parseLanguages({})).toEqual([]);
		expect(parseLanguages(null)).toEqual([]);
		expect(parseLanguages('nope')).toEqual([]);
		expect(parseLanguages({ TypeScript: -1 })).toEqual([]);
	});
});

// The manual fields always win on conflict: the Project's own `summary` is the
// description and its `stack` backstops the badges, while the repo's topics lead
// when it has them and its description is kept as provenance.
describe('mergeProjectMetadata', () => {
	const repo = {
		stars: 42,
		language: 'TypeScript',
		description: 'The repo description',
		topics: ['astro', 'portfolio'],
		languages: expectedLanguages,
	};

	it('takes the badges from the repo topics and keeps the manual summary', () => {
		expect(
			mergeProjectMetadata(
				{ summary: 'Manual summary', stack: ['Fallback'] },
				repo
			)
		).toEqual({
			stars: 42,
			language: 'TypeScript',
			tags: ['astro', 'portfolio'],
			languages: expectedLanguages,
			description: 'Manual summary',
			repoDescription: 'The repo description',
		});
	});

	it('falls back to the manual stack when the repo has no topics', () => {
		expect(
			mergeProjectMetadata(
				{ summary: 'Manual summary', stack: ['Astro', 'TypeScript'] },
				{ ...repo, topics: [] }
			).tags
		).toEqual(['Astro', 'TypeScript']);
	});

	it('degrades to the manual fields and no languages without a repo', () => {
		expect(
			mergeProjectMetadata(
				{ summary: 'Manual summary', stack: ['Astro'] },
				null
			)
		).toEqual({
			stars: null,
			language: null,
			tags: ['Astro'],
			languages: [],
			description: 'Manual summary',
			repoDescription: null,
		});
	});
});

describe('fetchRepoMetadata', () => {
	it('fetches the repo and its languages and combines them', async () => {
		await expect(
			fetchRepoMetadata('owner/repo', {
				fetch: fakeFetch(),
				cache: new Map(),
			})
		).resolves.toEqual({
			stars: 42,
			language: 'TypeScript',
			description: 'A fast Astro portfolio.',
			topics: ['astro', 'portfolio'],
			languages: expectedLanguages,
		});
	});

	it('keeps the repo summary when only the languages request fails', async () => {
		await expect(
			fetchRepoMetadata('owner/repo', {
				fetch: fakeFetch({ languagesOk: false }),
				cache: new Map(),
			})
		).resolves.toEqual({
			stars: 42,
			language: 'TypeScript',
			description: 'A fast Astro portfolio.',
			topics: ['astro', 'portfolio'],
			languages: [],
		});
	});

	it('returns null when GitHub answers with an error status', async () => {
		await expect(
			fetchRepoMetadata('owner/missing', {
				fetch: fakeFetch({ repoOk: false }),
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

		// One repo + one languages request per build, never a second pair.
		expect(calls).toBe(2);
	});
});

describe('enrichProject', () => {
	it('enriches a public project with the repo tags and languages', async () => {
		const { meta } = await enrichProject(project(), {
			fetch: fakeFetch(),
			cache: new Map(),
		});

		expect(meta.stars).toBe(42);
		expect(meta.language).toBe('TypeScript');
		expect(meta.tags).toEqual(['astro', 'portfolio']);
		expect(meta.languages).toEqual(expectedLanguages);
	});

	it('does not fetch for a private project and keeps the manual stack', async () => {
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
			tags: ['Astro', 'TypeScript'],
			languages: [],
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
			fetch: fakeFetch(),
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
