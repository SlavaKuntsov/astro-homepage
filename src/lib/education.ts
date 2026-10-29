/**
 * The `education` content collection (ADR-0004): its frontmatter schema and the
 * pure helpers that turn raw entries into display-ready, newest-first section
 * data. The schema is enforced at build, so a mistyped frontmatter field fails
 * the build; the helpers are exercised directly by Vitest and reused by the
 * home page's education section.
 *
 * Education is coarser-grained than Experience: a degree is dated by year
 * (`YYYY`), not by month, because that is how a Resume lists it. The Locale and
 * slug are read from the entry id (`{ru,en}/<slug>`) rather than from
 * frontmatter, keeping the two locale files paired by filename.
 */

import { z } from 'astro/zod';
import educationOrder from '@/content/education/order.json';
import { slugOfEntryId } from './collection';
import { rankOf } from './order';

/**
 * A four-digit year, as authored in frontmatter. Coerced from a number because
 * YAML parses an unquoted `2022` as an integer; the regex still rejects
 * `2022-09`, so the month-grained experience format cannot leak in here.
 */
const year = z.coerce.string().regex(/^\d{4}$/, 'expected a YYYY year');

/** One education entry's typed frontmatter. */
export const educationSchema = z
	.object({
		institution: z.string().min(1),
		institutionUrl: z.string().url().optional(),
		level: z.string().min(1),
		faculty: z.string().min(1).optional(),
		field: z.string().min(1).optional(),
		start: year,
		end: year.optional(),
		current: z.boolean().optional(),
		location: z.string().min(1).optional(),
	})
	.superRefine((entry, ctx) => {
		// A degree is either ongoing (`current`) or closed with an `end`; both at
		// once — or neither — is contradictory. `YYYY` strings compare
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
				message: 'an entry needs either an `end` year or `current: true`',
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

/** The validated frontmatter of one education entry. */
export type EducationFrontmatter = z.infer<typeof educationSchema>;

/** The minimal shape the helpers need; content-layer entries satisfy it. */
export interface EducationEntry {
	id: string;
	data: EducationFrontmatter;
}

/**
 * The entries in authored order, newest first. The order comes from
 * `education/order.json` (ADR-0009) — one list of slugs instead of an `order`
 * field in every file — so a slug not yet listed sorts last; the id breaks any
 * remaining tie. Returns a copy; the input is never reordered in place.
 */
export function orderedEducation<T extends EducationEntry>(
	entries: readonly T[],
	order: readonly string[] = educationOrder
): T[] {
	return [...entries].sort((a, b) => {
		const byRank =
			rankOf(slugOfEntryId(a.id), order) - rankOf(slugOfEntryId(b.id), order);

		return byRank !== 0 ? byRank : a.id.localeCompare(b.id);
	});
}

/** The degrees' dates as a single label: `start`, `start — end`, or `start — present`. */
export function formatYearPeriod(
	period: Pick<EducationFrontmatter, 'start' | 'end' | 'current'>,
	present: string
): string {
	if (period.current === true || period.end === undefined) {
		return `${period.start} — ${present}`;
	}

	return period.start === period.end
		? period.start
		: `${period.start} — ${period.end}`;
}
