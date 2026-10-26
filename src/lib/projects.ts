/**
 * The `projects` content collection (GLOSSARY: *Project*): the typed
 * frontmatter for a showcased piece of work, plus the pure helpers that turn
 * raw entries into display-ready data. A Project pairs manual fields (title,
 * summary, images, links, stack) with optional build-time *Enrichment* from a
 * public GitHub repo (`src/lib/enrichment.ts`); manual fields always win.
 *
 * The Locale and slug are read from the entry id (`{ru,en}/<slug>`) via
 * `collection.ts`, so the two locale files pair by filename. Display order is
 * `projects/order.json` (ADR-0009), with featured Projects first.
 */

import { z } from 'astro/zod';
import projectOrder from '@/content/projects/order.json';
import { slugOfEntryId } from './collection';
import { rankOf } from './order';

/** An `owner/repo` pair naming a public GitHub repository. */
const repoSlug = z
	.string()
	.regex(/^[\w.-]+\/[\w.-]+$/, 'expected an `owner/repo` pair');

/** One Project's typed frontmatter. */
export const projectSchema = z
	.object({
		title: z.string().min(1),
		// Optional on purpose: an unauthored (or `null`) summary lets *Enrichment*
		// supply the repo's description instead (see `mergeProjectMetadata`).
		summary: z.string().min(1).nullish(),
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
		githubRepo: repoSlug.optional(),
	})
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

/** The validated frontmatter of one Project. */
export type ProjectFrontmatter = z.infer<typeof projectSchema>;

/** The minimal shape the helpers need; content-layer entries satisfy it. */
export interface ProjectEntry {
	id: string;
	data: ProjectFrontmatter;
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
	data: Pick<ProjectFrontmatter, 'cover' | 'images'>
): string | null {
	return data.cover ?? data.images?.[0] ?? null;
}

/**
 * The detail page's gallery: the authored images, or the cover as the single
 * image when no gallery was authored.
 */
export function galleryImages(
	data: Pick<ProjectFrontmatter, 'cover' | 'images'>
): string[] {
	if (data.images !== undefined && data.images.length > 0) return data.images;
	return data.cover === undefined ? [] : [data.cover];
}
