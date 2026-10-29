/**
 * Shared entry helpers for the per-Locale content collections (ADR-0004):
 * `experience`, `education`, `projects`, and `arts` each author one markdown
 * file per Locale under `{ru,en}/<slug>.md`, with the Locale and slug read from
 * the entry id
 * rather than duplicated in frontmatter. Keeping the rule here — rather than in
 * whichever collection landed first — means every collection reads its id the
 * same way and fails with the same message when a file is misplaced.
 */

import type { Locale } from './i18n';

/** The minimal shape every content entry shares: an id, and its own data. */
export interface LocalizedEntry {
	id: string;
}

/**
 * The Locale an entry belongs to, read from its leading folder. Throws on any
 * other folder so a misplaced content file fails the build instead of silently
 * rendering under the default Locale.
 */
export function localeOfEntryId(id: string): Locale {
	const [folder] = id.split('/');
	if (folder === 'ru' || folder === 'en') return folder;

	throw new Error(
		`content entry id "${id}" must start with a \`ru/\` or \`en/\` folder`
	);
}

/** The slug an entry is paired by, read from its trailing segment. */
export function slugOfEntryId(id: string): string {
	const segments = id.split('/');
	return segments[segments.length - 1];
}

/** The entries authored for one Locale. */
export function entriesForLocale<T extends LocalizedEntry>(
	entries: readonly T[],
	locale: Locale
): T[] {
	return entries.filter(entry => localeOfEntryId(entry.id) === locale);
}

/** An entry's RU/EN counterparts, keyed by the slug they share. */
export interface LocalePair<T extends LocalizedEntry> {
	slug: string;
	ru?: T;
	en?: T;
}

/** Groups entries into locale pairs by their shared slug. */
export function pairBySlug<T extends LocalizedEntry>(
	entries: readonly T[]
): Map<string, LocalePair<T>> {
	const pairs = new Map<string, LocalePair<T>>();

	for (const entry of entries) {
		const slug = slugOfEntryId(entry.id);
		const pair = pairs.get(slug) ?? { slug };
		pair[localeOfEntryId(entry.id)] = entry;
		pairs.set(slug, pair);
	}

	return pairs;
}
