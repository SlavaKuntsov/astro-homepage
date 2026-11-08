/**
 * The `projects` content collection (GLOSSARY: *Project*): the typed
 * frontmatter for a showcased piece of work, plus the pure helpers that turn
 * raw entries into display-ready data.
 *
 * A Project's Locale-independent fields — cover, gallery, stack, links,
 * visibility, featured, published, and GitHub repo — live once in
 * `projects/shared.json`,
 * keyed by the slug both Locale files share, so a Project cannot drift between
 * Locales (ADR-0004). The per-Locale markdown keeps only `title`, `summary`, and
 * the body; `mergeProject` folds a localized entry with its shared record into
 * the shape the Site renders and *Enrichment* reads.
 *
 * The Locale and slug are read from the entry id (`{ru,en}/<slug>`) via
 * `collection.ts`, so the two locale files pair by filename. Display order is
 * `projects/order.json` (ADR-0009), with featured Projects first.
 */

import { z } from 'astro/zod';
import projectOrder from '@/content/projects/order.json';
import sharedProjectData from '@/content/projects/shared.json';
import { slugOfEntryId } from './collection';
import { rankOf } from './order';

/** An `owner/repo` pair naming a public GitHub repository. */
const repoSlug = z
	.string()
	.regex(/^[\w.-]+\/[\w.-]+$/, 'expected an `owner/repo` pair');

/**
 * The fields every Locale shares, authored once per slug in `shared.json`.
 * A Project that names a private visibility cannot also name a repo.
 */
export const sharedProjectSchema = z
	.object({
		cover: z.string().min(1).optional(),
		images: z.array(z.string().min(1)).optional(),
		stack: z.array(z.string().min(1)).optional(),
		links: z
			.object({
				live: z.string().url().optional(),
				github: z.string().url().optional(),
				other: z.string().url().optional(),
			})
			.optional(),
		visibility: z.enum(['public', 'private']),
		featured: z.boolean().optional(),
		// A display toggle, not a visibility one: `false` keeps the Project in the
		// repo but takes it off the Site. Defaults to `true` so existing records
		// need no change.
		published: z.boolean().default(true),
		githubRepo: repoSlug.optional(),
	})
	.strict()
	.superRefine((project, ctx) => {
		// Enrichment only reads public repos, so naming one on a private Project
		// is a contradiction: fail at build rather than at the fetch.
		if (project.githubRepo !== undefined && project.visibility !== 'public') {
			ctx.addIssue({
				code: 'custom',
				path: ['githubRepo'],
				message: "`githubRepo` requires `visibility: 'public'`",
			});
		}
	});

/**
 * One Project's Locale-independent fields, as authored in `shared.json`.
 * This is the schema's input type, so `published` is optional: omitting it is
 * valid and the parsed record gets the `true` default.
 */
export type ProjectSharedFrontmatter = z.input<typeof sharedProjectSchema>;

/**
 * One Project's per-Locale frontmatter: only the fields that actually differ
 * between Locales, plus the markdown body. Shared fields are rejected here so a
 * duplicated `cover` or `stack` fails the build instead of drifting.
 */
export const projectSchema = z
	.object({
		title: z.string().min(1),
		// Optional on purpose: an unauthored (or `null`) summary lets *Enrichment*
		// supply the repo's description instead (see `mergeProjectMetadata`).
		summary: z.string().min(1).nullish(),
	})
	.strict();

/** The validated per-Locale frontmatter of one Project. */
export type ProjectLocalizedFrontmatter = z.infer<typeof projectSchema>;

/** A localized Project's data merged with its shared record: what pages render. */
export type ProjectData = ProjectLocalizedFrontmatter &
	ProjectSharedFrontmatter;

/** The slug-keyed shared records, validated once at build. */
export const sharedProjects = z
	.record(z.string().min(1), sharedProjectSchema)
	.parse(sharedProjectData);

/** The minimal shape a localized content entry has before merging. */
export interface LocalizedProjectEntry {
	id: string;
	data: ProjectLocalizedFrontmatter;
}

/** The minimal merged shape the helpers need; rendered entries satisfy it. */
export interface ProjectEntry {
	id: string;
	data: ProjectData;
}

/** A localized entry with its shared fields filled in by `mergeProject`. */
export type MergedProjectEntry<
	T extends LocalizedProjectEntry = LocalizedProjectEntry,
> = T & ProjectEntry;

/**
 * Fold a localized Project together with its shared record. The shared record
 * supplies everything except `title` and `summary`, which the localized entry
 * keeps; a slug with no shared record throws so a half-authored Project fails
 * the build instead of rendering undefined fields.
 */
export function mergeProject<T extends LocalizedProjectEntry>(
	entry: T,
	sharedBySlug: Readonly<
		Record<string, ProjectSharedFrontmatter>
	> = sharedProjects
): MergedProjectEntry<T> {
	const slug = slugOfEntryId(entry.id);
	const shared = sharedBySlug[slug];

	if (shared === undefined) {
		throw new Error(
			`project "${slug}" has no record in \`projects/shared.json\``
		);
	}

	return { ...entry, data: { ...shared, ...entry.data } };
}

/**
 * The Projects the Site shows: those not explicitly unpublished. `published`
 * defaults to `true`, so a Project is hidden only by authoring
 * `published: false` in its shared record. Returns a new array; the input is
 * left untouched.
 */
export function publishedProjects<T extends ProjectEntry>(
	entries: readonly T[]
): T[] {
	return entries.filter(entry => entry.data.published !== false);
}

/**
 * The Projects in authored order, featured first. Featured Projects lead the
 * index; the rest follow `projects/order.json` (ADR-0009), so a slug not yet
 * listed sorts last and the id breaks any remaining tie. Returns a copy; the
 * input is never reordered in place.
 */
export function orderedProjects<T extends ProjectEntry>(
	entries: readonly T[],
	order: readonly string[] = projectOrder
): T[] {
	const rank = (entry: T) => rankOf(slugOfEntryId(entry.id), order);
	const featureWeight = (entry: T) => (entry.data.featured === true ? 0 : 1);

	return [...entries].sort((a, b) => {
		const byFeatured = featureWeight(a) - featureWeight(b);
		if (byFeatured !== 0) return byFeatured;

		const byRank = rank(a) - rank(b);
		return byRank !== 0 ? byRank : a.id.localeCompare(b.id);
	});
}

/** The image shown on an index card: the cover, else the first gallery image. */
export function coverImage(
	data: Pick<ProjectSharedFrontmatter, 'cover' | 'images'>
): string | null {
	return data.cover ?? data.images?.[0] ?? null;
}

/**
 * The detail page's gallery: the authored images, or the cover as the single
 * image when no gallery was authored.
 */
export function galleryImages(
	data: Pick<ProjectSharedFrontmatter, 'cover' | 'images'>
): string[] {
	if (data.images !== undefined && data.images.length > 0) return data.images;
	return data.cover === undefined ? [] : [data.cover];
}
