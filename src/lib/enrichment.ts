/**
 * Build-time *Enrichment* for a Project that names a public GitHub repo
 * (GLOSSARY: *Enrichment*). It fetches the repo's stars, topics, primary
 * language, description, and language breakdown, and folds them into the
 * Project's display data.
 *
 * Two rules shape this module:
 *
 * - **The repo supplies the badges.** A Project's header tags are the repo's
 *   topics; the manual `stack` is the fallback for a private repo or one with
 *   no topics. The manual `summary` stays the description, never overwritten.
 * - **It is never required.** A network error, a rate limit, or an unknown repo
 *   resolves to `null` metadata and the build carries on unaffected.
 *
 * The GitHub API is a system boundary, so the `fetch` implementation, token,
 * and cache are injected. One build fetches each repo once (two requests:
 * the repo and its languages).
 */

import type { ProjectEntry } from './projects';

/** One language's share of a repository, as GitHub counts bytes. */
export interface LanguageShare {
	name: string;
	/** Percentage of the repo's bytes, to one decimal place. */
	percent: number;
}

/** What GitHub's repo endpoint reports; the languages endpoint is separate. */
export interface RepoSummary {
	stars: number;
	language: string | null;
	description: string | null;
	topics: string[];
}

/** A repo's full Enrichment: the summary plus its language breakdown. */
export interface RepoMetadata extends RepoSummary {
	languages: LanguageShare[];
}

/** A Project's display metadata after Enrichment has (or has not) run. */
export interface ProjectMetadata {
	stars: number | null;
	language: string | null;
	/** Header badges: the repo's topics, else the manual `stack`. */
	tags: string[];
	/** The repo's language breakdown, largest first; empty when unknown. */
	languages: LanguageShare[];
	/** The Project's description — the manual `summary`, which always wins. */
	description: string;
	/** The repo's own description, shown as provenance; `null` when unknown. */
	repoDescription: string | null;
}

/** The slice of the Fetch API this module needs, so tests can supply a fake. */
export type FetchLike = (
	url: string,
	init?: { headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Injectables for the system boundary; every one has a production default. */
export interface EnrichmentDeps {
	fetch?: FetchLike;
	/** A GitHub token, when the environment provides one (raises the rate limit). */
	token?: string;
	/** Memoization across calls; defaults to the build-wide cache below. */
	cache?: Map<string, RepoMetadata | null>;
}

/** One build-wide cache, so the index and a detail page share one fetch per repo. */
const repoCache = new Map<string, RepoMetadata | null>();

const GITHUB_REPOS = 'https://api.github.com/repos';

/** A stalled request must not stall the build; Enrichment is optional. */
const REQUEST_TIMEOUT_MS = 8_000;

/** One request's JSON body, or `null` when it fails in any way. */
async function readJson(
	request: FetchLike,
	url: string,
	init: { headers: Record<string, string>; signal?: AbortSignal }
): Promise<unknown> {
	try {
		const response = await request(url, init);
		return response.ok ? await response.json() : null;
	} catch {
		// Enrichment is optional: a network error, timeout, rate limit, or
		// unknown repo must never fail the build.
		return null;
	}
}

/** Reads the subset of GitHub's repo payload that the Site shows. */
export function parseRepoMetadata(payload: unknown): RepoSummary | null {
	if (typeof payload !== 'object' || payload === null) return null;

	const { stargazers_count, language, description, topics } = payload as Record<
		string,
		unknown
	>;
	if (typeof stargazers_count !== 'number') return null;

	return {
		stars: stargazers_count,
		language: typeof language === 'string' ? language : null,
		description: typeof description === 'string' ? description : null,
		topics: Array.isArray(topics)
			? topics.filter(
					(topic): topic is string =>
						typeof topic === 'string' && topic.length > 0
				)
			: [],
	};
}

/**
 * Turns GitHub's `{ [language]: bytes }` payload into shares, largest first.
 * A missing or malformed payload yields no languages rather than an error.
 */
export function parseLanguages(payload: unknown): LanguageShare[] {
	if (typeof payload !== 'object' || payload === null) return [];

	const byBytes = Object.entries(payload)
		.filter(
			(entry): entry is [string, number] =>
				typeof entry[1] === 'number' && entry[1] > 0
		)
		.sort(([nameA, bytesA], [nameB, bytesB]) => {
			const byBytesDesc = bytesB - bytesA;
			return byBytesDesc !== 0 ? byBytesDesc : nameA.localeCompare(nameB);
		});

	const total = byBytes.reduce((sum, [, bytes]) => sum + bytes, 0);
	if (total === 0) return [];

	return byBytes.map(([name, bytes]) => ({
		name,
		percent: Math.round((bytes / total) * 1000) / 10,
	}));
}

/**
 * Combine fetched repo metadata with the Project's manual fields. The badges
 * come from the repo's topics (falling back to the manual `stack`), the manual
 * `summary` is the displayed description and is never overwritten, and the
 * repo's description is preserved as `repoDescription`.
 */
export function mergeProjectMetadata(
	manual: Pick<ProjectEntry['data'], 'summary' | 'stack'>,
	repo: RepoMetadata | null
): ProjectMetadata {
	const topics = repo?.topics ?? [];

	return {
		stars: repo?.stars ?? null,
		language: repo?.language ?? null,
		tags: topics.length > 0 ? topics : manual.stack,
		languages: repo?.languages ?? [],
		description: manual.summary,
		repoDescription: repo?.description ?? null,
	};
}

/**
 * Fetch one repo's metadata and languages, or `null` on failure. Successful and
 * failed lookups are both cached, so a flaky network cannot make the same build
 * fetch one repo twice. A languages failure still returns the repo summary.
 */
export async function fetchRepoMetadata(
	repo: string,
	deps: EnrichmentDeps = {}
): Promise<RepoMetadata | null> {
	const cache = deps.cache ?? repoCache;
	if (cache.has(repo)) return cache.get(repo) ?? null;

	const request = deps.fetch ?? globalThis.fetch;
	const token = deps.token ?? process.env.GITHUB_TOKEN;
	const signal =
		typeof AbortSignal.timeout === 'function'
			? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
			: undefined;
	const init = {
		headers: {
			accept: 'application/vnd.github+json',
			...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
		},
		...(signal === undefined ? {} : { signal }),
	};

	const url = `${GITHUB_REPOS}/${repo}`;
	const [summary, languages] = await Promise.all([
		readJson(request, url, init).then(parseRepoMetadata),
		readJson(request, `${url}/languages`, init).then(parseLanguages),
	]);

	const metadata: RepoMetadata | null =
		summary === null ? null : { ...summary, languages };
	cache.set(repo, metadata);
	return metadata;
}

/** One Project together with its resolved metadata. */
export interface EnrichedProject<T extends ProjectEntry> {
	entry: T;
	meta: ProjectMetadata;
}

/**
 * Resolve a Project's metadata. Only a public Project that names a repo is
 * fetched; everything else keeps its manual fields with empty metadata.
 */
export async function enrichProject<T extends ProjectEntry>(
	entry: T,
	deps: EnrichmentDeps = {}
): Promise<EnrichedProject<T>> {
	const { visibility, githubRepo } = entry.data;
	const repo =
		visibility === 'public' && githubRepo !== undefined
			? await fetchRepoMetadata(githubRepo, deps)
			: null;

	return { entry, meta: mergeProjectMetadata(entry.data, repo) };
}

/** Resolve metadata for each Project, preserving the input order. */
export function enrichProjects<T extends ProjectEntry>(
	entries: readonly T[],
	deps: EnrichmentDeps = {}
): Promise<EnrichedProject<T>[]> {
	return Promise.all(entries.map(entry => enrichProject(entry, deps)));
}
