import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';
import artworkOrder from '@/content/arts/order.json';
import { artworkSchema, orderedArts, type ArtworkEntry } from '@/lib/arts';

// The `arts` collection's frontmatter is enforced at build (ADR-0004): a
// mistyped field, or a missing required one, must fail. These tests pin the
// rules the markdown files rely on, plus the display order the gallery depends
// on — `arts/order.json` (ADR-0009), not a frontmatter field.
//
// The loader's content-image helper is a Vite-plugin closure that resolves a
// path against the filesystem, so the schema is built here with a stub. These
// tests pin the rules that do not depend on it — a required, non-empty `image`,
// with the title, tags, and link rules — while the real helper and the image
// files themselves are exercised by the build and `e2e/arts.spec.ts`.
const schema = artworkSchema(() => z.string().min(1));

type ArtworkInput = z.input<typeof schema>;

const validArtwork: ArtworkInput = {
	title: 'Untitled',
	image: '../../../assets/arts/art1.png',
};

/** A sortable entry; the helper reads only the id, so the payload is minimal. */
const withArt = (id: string): ArtworkEntry => ({
	id,
	data: {
		title: 'Untitled',
		image: { src: 'art.png', width: 350, height: 350, format: 'png' },
	},
});

describe('artwork schema', () => {
	it('accepts a minimal artwork', () => {
		expect(schema.safeParse(validArtwork).success).toBe(true);
	});

	it('accepts tags and an external link', () => {
		expect(
			schema.safeParse({
				...validArtwork,
				tags: ['character', 'ink'],
				link: 'https://example.com/post/1',
			}).success
		).toBe(true);
	});

	it('rejects an artwork missing its title or image', () => {
		const { title, ...noTitle } = validArtwork;
		const { image, ...noImage } = validArtwork;

		expect(schema.safeParse(noTitle).success).toBe(false);
		expect(schema.safeParse(noImage).success).toBe(false);
	});

	it('rejects an empty title or image', () => {
		expect(
			schema.safeParse({ ...validArtwork, title: '' }).success
		).toBe(false);
		expect(
			schema.safeParse({ ...validArtwork, image: '' }).success
		).toBe(false);
	});

	it('rejects an empty tag', () => {
		expect(
			schema.safeParse({ ...validArtwork, tags: ['ok', ''] }).success
		).toBe(false);
	});

	it('rejects a link that is not a URL', () => {
		expect(
			schema.safeParse({ ...validArtwork, link: 'nope' }).success
		).toBe(false);
	});
});

// The gallery renders in the authored manifest order (ADR-0009), so a slug not
// yet listed sorts last and the id breaks any remaining tie.
describe('art ordering', () => {
	const arts = [withArt('ru/third'), withArt('ru/first'), withArt('ru/second')];

	const order = ['first', 'second', 'third'];

	it('follows the manifest order', () => {
		expect(orderedArts(arts, order).map(a => a.id)).toEqual([
			'ru/first',
			'ru/second',
			'ru/third',
		]);
	});

	it('does not mutate the input', () => {
		orderedArts(arts, order);

		expect(arts.map(a => a.id)).toEqual(['ru/third', 'ru/first', 'ru/second']);
	});

	it('sorts a slug absent from the manifest after the listed ones', () => {
		expect(
			orderedArts(
				[withArt('ru/unlisted'), withArt('ru/listed')],
				['listed']
			).map(a => a.id)
		).toEqual(['ru/listed', 'ru/unlisted']);
	});
});

// Every artwork must be listed: a slug with no manifest entry would silently
// drop to the end of the gallery, so the manifest and the content files stay in
// step (ADR-0009). Both Locales are checked, and they must pair by slug.
describe('order manifest', () => {
	const slugsIn = (locale: 'ru' | 'en') => {
		const dir = fileURLToPath(
			new URL(`../content/arts/${locale}`, import.meta.url)
		);

		return readdirSync(dir)
			.filter(name => name.endsWith('.md'))
			.map(name => name.replace(/\.md$/, ''));
	};

	it('lists every art slug exactly once', () => {
		// The set comparison catches a missing or extra slug; the length check
		// catches a slug listed twice, which the set would silently collapse.
		expect(new Set(artworkOrder)).toEqual(new Set(slugsIn('ru')));
		expect(artworkOrder.length).toBe(new Set(artworkOrder).size);
	});

	it('pairs every art across Locales', () => {
		expect(new Set(slugsIn('en'))).toEqual(new Set(slugsIn('ru')));
	});
});
