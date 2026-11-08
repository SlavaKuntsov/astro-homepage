/**
 * The authored Projects, read from `shared.json` so the rendered-page tests
 * follow whatever the owner publishes instead of naming a slug.
 *
 * A Project that is added, renamed, hidden, or removed needs no e2e edit: the
 * scenarios derive their sample slug, gallery, links, and language-breakdown
 * routes from this data. This file only *selects* scenarios; the assertions
 * still run against the rendered page, as the e2e seam requires.
 */
import { readFileSync } from 'node:fs';

/** The slice of a Shared Project record the e2e scenarios care about. */
export interface SharedProject {
	cover?: string;
	images?: string[];
	links?: { live?: string; github?: string; other?: string };
	published?: boolean;
	githubRepo?: string;
}

const shared = JSON.parse(
	readFileSync(
		new URL('../src/content/projects/shared.json', import.meta.url),
		'utf8'
	)
) as Record<string, SharedProject>;

/** The shared record for a Project slug. */
export const sharedFor = (slug: string): SharedProject => shared[slug];

/** The Projects the Site shows; `published` omitted means published. */
export const publishedSlugs = Object.keys(shared).filter(
	slug => shared[slug].published !== false
);

/** The Projects kept in the repo but hidden from the Site. */
export const unpublishedSlugs = Object.keys(shared).filter(
	slug => shared[slug].published === false
);

/** Published Projects that author more than one gallery image. */
export const gallerySlugs = publishedSlugs.filter(
	slug => (shared[slug].images?.length ?? 0) > 1
);

/** Published Projects naming a public repo, so Enrichment may add languages. */
export const repoSlugs = publishedSlugs.filter(
	slug => shared[slug].githubRepo !== undefined
);

/** The image a card or detail page shares, matching `coverImage` in `src/lib/projects`. */
export function coverOf(slug: string): string | undefined {
	const project = shared[slug];
	return project.cover ?? project.images?.[0];
}

/** Published Projects whose card or detail page has a cover image. */
export const coverSlugs = publishedSlugs.filter(
	slug => coverOf(slug) !== undefined
);
