/**
 * The `arts` content collection (GLOSSARY: *Artwork*): the typed frontmatter for
 * a gallery image item, plus the pure ordering helper the gallery renders
 * through. An Artwork is a title, one image, and optional tags and an external
 * link; it opens in the Arts lightbox (`src/components/ArtsGallery.astro`).
 *
 * The Locale and slug are read from the entry id (`{ru,en}/<slug>`) via
 * `collection.ts`, so the two locale files pair by filename. Display order is
 * `arts/order.json` (ADR-0009).
 */

import { z } from 'astro/zod';
import artworkOrder from '@/content/arts/order.json';
import { slugOfEntryId } from './collection';
import { rankOf } from './order';

/** One Artwork's typed frontmatter. */
export const artworkSchema = z.object({
	title: z.string().min(1),
	image: z.string().min(1),
	tags: z.array(z.string().min(1)).optional(),
	link: z.string().url().optional(),
});

/** The validated frontmatter of one Artwork. */
export type ArtworkFrontmatter = z.infer<typeof artworkSchema>;

/** The minimal shape the helper needs; content-layer entries satisfy it. */
export interface ArtworkEntry {
	id: string;
	data: ArtworkFrontmatter;
}

/**
 * The Artworks in authored order. The order comes from `arts/order.json`
 * (ADR-0009) — one list of slugs instead of an `order` field in every file — so
 * a slug not yet listed sorts last; the id breaks any remaining tie. Returns a
 * copy; the input is never reordered in place.
 */
export function orderedArts<T extends ArtworkEntry>(
	entries: readonly T[],
	order: readonly string[] = artworkOrder
): T[] {
	return [...entries].sort((a, b) => {
		const byRank =
			rankOf(slugOfEntryId(a.id), order) - rankOf(slugOfEntryId(b.id), order);

		return byRank !== 0 ? byRank : a.id.localeCompare(b.id);
	});
}
