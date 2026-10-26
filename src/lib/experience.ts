/**
 * The `experience` content collection (ADR-0004): its frontmatter schema and
 * the pure helpers that turn raw entries into display-ready, newest-first
 * timeline data. The schema is enforced at build, so a mistyped frontmatter
 * field fails the build; the helpers are exercised directly by Vitest and
 * reused by the timeline and the highlights block.
 *
 * The Locale and slug are read from the entry id (`{ru,en}/<slug>`) rather than
 * from frontmatter, keeping the two locale files paired by filename.
 */

import { z } from 'astro/zod';
import experienceOrder from '@/content/experience/order.json';
import type { Locale } from './i18n';
import { rankOf } from './order';

/** A `YYYY-MM` date, as authored in frontmatter. */
const month = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected a YYYY-MM date');

/** One Experience entry's typed frontmatter (GLOSSARY: *Experience entry*). */
export const experienceSchema = z
	.object({
		company: z.string().min(1),
		companyUrl: z.string().url().optional(),
		position: z.string().min(1),
		start: month,
		end: month.optional(),
		current: z.boolean().optional(),
		location: z.string().min(1).optional(),
		employmentType: z.string().min(1).optional(),
		industries: z.array(z.string().min(1)).optional(),
		summary: z.string().min(1),
		highlights: z.array(z.string().min(1)),
		environment: z.array(z.string().min(1)),
	})
	.superRefine((entry, ctx) => {
		// A role is either ongoing (`current`) or closed with an `end`; both at
		// once — or neither — is contradictory. `YYYY-MM` strings compare
		// chronologically, so the range order is checked on the same values.
		if (entry.current === true && entry.end !== undefined) {
			ctx.addIssue({
				code: 'custom',
				path: ['end'],
				message: '`current` and `end` are mutually exclusive',
			});
		}
		if (entry.current !== true && entry.end === undefined) {
			ctx.addIssue({
				code: 'custom',
				path: ['end'],
				message: 'an entry needs either an `end` date or `current: true`',
			});
		}
		if (entry.end !== undefined && entry.end < entry.start) {
			ctx.addIssue({
				code: 'custom',
				path: ['end'],
				message: '`end` must not precede `start`',
			});
		}
	});

/** The validated frontmatter of one Experience entry. */
export type ExperienceFrontmatter = z.infer<typeof experienceSchema>;

/** The minimal shape the helpers need; content-layer entries satisfy it. */
export interface ExperienceEntry {
	id: string;
	data: ExperienceFrontmatter;
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
		`experience entry id "${id}" must start with a \`ru/\` or \`en/\` folder`
	);
}

/** The slug an entry is paired by, read from its trailing segment. */
export function slugOfEntryId(id: string): string {
	const segments = id.split('/');
	return segments[segments.length - 1];
}

/** The entries authored for one Locale. */
export function entriesForLocale<T extends ExperienceEntry>(
	entries: readonly T[],
	locale: Locale
): T[] {
	return entries.filter(entry => localeOfEntryId(entry.id) === locale);
}

/**
 * The entries in authored order, newest first. The order comes from
 * `experience/order.json` (ADR-0009) — one list of slugs instead of an `order`
 * field in every file — so a slug not yet listed sorts last; the id breaks any
 * remaining tie. Returns a copy; the input is never reordered in place.
 */
export function orderedEntries<T extends ExperienceEntry>(
	entries: readonly T[],
	order: readonly string[] = experienceOrder
): T[] {
	return [...entries].sort((a, b) => {
		const byRank =
			rankOf(slugOfEntryId(a.id), order) - rankOf(slugOfEntryId(b.id), order);

		return byRank !== 0 ? byRank : a.id.localeCompare(b.id);
	});
}

/** The most recent entries, for the home highlights block. */
export function recentEntries<T extends ExperienceEntry>(
	entries: readonly T[],
	limit: number,
	order: readonly string[] = experienceOrder
): T[] {
	return orderedEntries(entries, order).slice(0, limit);
}

/** An entry's RU/EN counterparts, keyed by the slug they share. */
export interface ExperiencePair<T extends ExperienceEntry> {
	slug: string;
	ru?: T;
	en?: T;
}

/** Groups entries into locale pairs by their shared slug. */
export function pairBySlug<T extends ExperienceEntry>(
	entries: readonly T[]
): Map<string, ExperiencePair<T>> {
	const pairs = new Map<string, ExperiencePair<T>>();

	for (const entry of entries) {
		const slug = slugOfEntryId(entry.id);
		const pair = pairs.get(slug) ?? { slug };
		pair[localeOfEntryId(entry.id)] = entry;
		pairs.set(slug, pair);
	}

	return pairs;
}

/** Month names, spelled out per Locale so dates never depend on ICU data. */
const MONTH_NAMES: Record<Locale, readonly string[]> = {
	ru: [
		'январь',
		'февраль',
		'март',
		'апрель',
		'май',
		'июнь',
		'июль',
		'август',
		'сентябрь',
		'октябрь',
		'ноябрь',
		'декабрь',
	],
	en: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	],
};

/** Renders one `YYYY-MM` value as e.g. "июль 2023" / "July 2023". */
export function formatMonthYear(value: string, locale: Locale): string {
	const [year, month] = value.split('-');
	return `${MONTH_NAMES[locale][Number(month) - 1]} ${year}`;
}

/** The roles' dates as a single label: `start — end` or `start — present`. */
export function formatPeriod(
	period: Pick<ExperienceFrontmatter, 'start' | 'end' | 'current'>,
	locale: Locale,
	present: string
): string {
	const start = formatMonthYear(period.start, locale);
	const end =
		period.current === true || period.end === undefined
			? present
			: formatMonthYear(period.end, locale);

	return `${start} — ${end}`;
}
