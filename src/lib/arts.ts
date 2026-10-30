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

import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import artworkOrder from '@/content/arts/order.json';
import { slugOfEntryId } from './collection';
import { rankOf } from './order';

/**
 * The `arts` schema. `image` is the loader's content-image helper
 * (`schema: ({ image }) => …`): it resolves an Artwork's relative path to typed
 * `ImageMetadata` at build — failing the build when the file is missing — so the
 * carousel and gallery can pass that object to `<Picture>`, which emits an
 * optimized AVIF/WebP set per Artwork (ADR-0002: Astro-native). It is generic
 * over the helper's schema so the resolved field keeps its type, and a unit test
 * can pass a stub where the loader's helper — a Vite-plugin closure — is absent.
 */
export function artworkSchema<T extends z.ZodTypeAny>(image: () => T) {
	return z.object({
		title: z.string().min(1),
		image: image(),
		tags: z.array(z.string().min(1)).optional(),
		link: z.string().url().optional(),
	});
}

/**
 * The validated frontmatter of one Artwork. `image` is the `ImageMetadata` the
 * loader's helper resolves — not a URL string.
 */
export interface ArtworkFrontmatter {
	title: string;
	image: ImageMetadata;
	tags?: string[];
	link?: string;
}

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
