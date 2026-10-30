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
import { slugOfEntryId } from './collection';
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

/** Russian plural picker: 1 год, 2 года, 5 лет. */
function pluralRu(
	value: number,
	one: string,
	few: string,
	many: string
): string {
	const mod100 = value % 100;
	const mod10 = value % 10;

	if (mod100 >= 11 && mod100 <= 14) return many;
	if (mod10 === 1) return one;
	if (mod10 >= 2 && mod10 <= 4) return few;
	return many;
}

/** The unit words per Locale, so plural agreement lives in one place. */
const DURATION_WORDS: Record<
	Locale,
	{ year: (value: number) => string; month: (value: number) => string }
> = {
	ru: {
		year: value => pluralRu(value, 'год', 'года', 'лет'),
		month: value => pluralRu(value, 'месяц', 'месяца', 'месяцев'),
	},
	en: {
		year: value => (value === 1 ? 'year' : 'years'),
		month: value => (value === 1 ? 'month' : 'months'),
	},
};

/**
 * How long a role lasted, in whole months, as the plain difference between the
 * first and the last month — so September 2024 — September 2025 is "1 year",
 * not the "1 year 1 month" that hh.ru's inclusive counting reports. An ongoing
 * role (`current`) is measured up to `now`; a role in its first month is `0`.
 */
export function durationInMonths(
	period: Pick<ExperienceFrontmatter, 'start' | 'end' | 'current'>,
	now: Date = new Date()
): number {
	const [startYear, startMonth] = period.start.split('-').map(Number);
	const [endYear, endMonth] =
		period.current === true || period.end === undefined
			? [now.getFullYear(), now.getMonth() + 1]
			: period.end.split('-').map(Number);

	return Math.max(0, (endYear - startYear) * 12 + (endMonth - startMonth));
}

/** Renders a whole-month count as "1 год 1 месяц" / "1 year 1 month". */
export function formatDuration(months: number, locale: Locale): string {
	if (months <= 0)
		return locale === 'ru' ? 'менее месяца' : 'less than a month';

	const words = DURATION_WORDS[locale];
	const years = Math.floor(months / 12);
	const rest = months % 12;
	const parts: string[] = [];

	if (years > 0) parts.push(`${years} ${words.year(years)}`);
	if (rest > 0) parts.push(`${rest} ${words.month(rest)}`);

	return parts.join(' ');
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
