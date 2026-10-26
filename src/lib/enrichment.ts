/**
 * Build-time *Enrichment* for a Project that names a public GitHub repo
 * (GLOSSARY: *Enrichment*). It fetches the repo's stars, primary language, and
 * description and folds them into the Project's display data.
 *
 * Two rules shape this module:
 *
 * - **Manual fields always win.** The Project's own `summary` is the
 *   description; the repo's description is kept alongside as provenance.
 * - **It is never required.** A network error, a rate limit, or an unknown repo
 *   resolves to `null` metadata and the build carries on unaffected.
 *
 * The GitHub API is a system boundary, so the `fetch` implementation, token,
 * and cache are injected. One build fetches each repo once.
 */

import type { ProjectEntry } from './projects';

/** What GitHub reports for a public repository. */
export interface RepoMetadata {
	stars: number;
	language: string | null;
	description: string | null;
}

/** A Project's display metadata after Enrichment has (or has not) run. */
export interface ProjectMetadata {
	stars: number | null;
	language: string | null;
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

/** Reads the subset of GitHub's repo payload that the Site shows. */
export function parseRepoMetadata(payload: unknown): RepoMetadata | null {
	if (typeof payload !== 'object' || payload === null) return null;

	const { stargazers_count, language, description } = payload as Record<
		string,
		unknown
	>;
	if (typeof stargazers_count !== 'number') return null;

	return {
		stars: stargazers_count,
		language: typeof language === 'string' ? language : null,
		description: typeof description === 'string' ? description : null,
	};
}

/**
 * Combine fetched repo metadata with the Project's manual fields. The manual
 * `summary` is the displayed description and is never overwritten; the repo's
 * description is preserved as `repoDescription` instead.
 */
export function mergeProjectMetadata(
	manual: Pick<ProjectEntry['data'], 'summary'>,
	repo: RepoMetadata | null
): ProjectMetadata {
	return {
		stars: repo?.stars ?? null,
		language: repo?.language ?? null,
		description: manual.summary,
		repoDescription: repo?.description ?? null,
	};
}

/**
 * Fetch one repo's metadata, or `null` on any failure. Successful and failed
 * lookups are both cached, so a flaky network cannot make the same build fetch
 * one repo twice.
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
	let metadata: RepoMetadata | null = null;

	try {
		const response = await request(`${GITHUB_REPOS}/${repo}`, {
			headers: {
				accept: 'application/vnd.github+json',
				...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
			},
			...(signal === undefined ? {} : { signal }),
		});

		if (response.ok) metadata = parseRepoMetadata(await response.json());
	} catch {
		// Enrichment is optional: a network error, rate limit, or unknown repo
		// must never fail the build.
		metadata = null;
	}

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
