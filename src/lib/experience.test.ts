import { describe, expect, it } from 'vitest';
import {
	entriesForLocale,
	experienceSchema,
	formatPeriod,
	localeOfEntryId,
	pairBySlug,
	recentEntries,
	slugOfEntryId,
	sortByRecency,
	type ExperienceEntry,
	type ExperienceFrontmatter,
} from '@/lib/experience';

// The `experience` collection's frontmatter is enforced at build (ADR-0004):
// a mistyped or missing field must fail, so the Resume can never render
// untyped. These tests pin the schema rules the markdown files rely on.
const validEntry = {
	company: 'HyperQuant',
	position: 'Junior Backend Developer',
	start: '2024-03',
	current: true,
	summary: 'Backend work on the .NET platform.',
	highlights: ['Shipped a trading API'],
	environment: ['.NET', 'PostgreSQL'],
	order: 0,
};

const withEntry = (
	id: string,
	overrides: Partial<ExperienceFrontmatter> = {}
): ExperienceEntry => ({
	id,
	data: { ...validEntry, ...overrides },
});

describe('experience schema', () => {
	it('accepts a complete entry', () => {
		expect(experienceSchema.safeParse(validEntry).success).toBe(true);
	});

	it('accepts an optional company URL and past dates', () => {
		const past = {
			...validEntry,
			companyUrl: 'https://hyperquant.net',
			current: undefined,
			start: '2022-01',
			end: '2023-12',
			location: 'Minsk',
			employmentType: 'Full-time',
			industries: ['Fintech'],
		};

		expect(experienceSchema.safeParse(past).success).toBe(true);
	});

	it('rejects an entry missing a required field', () => {
		const { company, ...rest } = validEntry;

		expect(experienceSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects an entry with neither an end date nor the current flag', () => {
		const { current, ...rest } = validEntry;

		expect(experienceSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects a malformed date', () => {
		const bad = { ...validEntry, start: 'March 2024' };

		expect(experienceSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects an entry that is both current and closed', () => {
		const contradictory = { ...validEntry, current: true, end: '2024-01' };

		expect(experienceSchema.safeParse(contradictory).success).toBe(false);
	});

	it('rejects an end date that precedes the start', () => {
		const backwards = {
			...validEntry,
			current: undefined,
			start: '2024-05',
			end: '2023-01',
		};

		expect(experienceSchema.safeParse(backwards).success).toBe(false);
	});
});

// The slug and Locale come from the file path (`experience/{ru,en}/<slug>.md`),
// not from frontmatter, so the content layer's entry id is the only source.
describe('entry id parsing', () => {
	it('reads the Locale from the leading folder', () => {
		expect(localeOfEntryId('ru/hyperquant')).toBe('ru');
		expect(localeOfEntryId('en/hyperquant')).toBe('en');
	});

	it('reads the slug from the trailing segment', () => {
		expect(slugOfEntryId('ru/hyperquant')).toBe('hyperquant');
		expect(slugOfEntryId('en/hyperquant')).toBe('hyperquant');
	});

	it('fails loudly on a file outside a Locale folder', () => {
		expect(() => localeOfEntryId('hyperquant')).toThrow(/ru\/.*or.*en\//);
		expect(() => localeOfEntryId('eng/hyperquant')).toThrow();
	});

	it('keeps only the requested Locale', () => {
		const entries = [
			withEntry('ru/bmrc'),
			withEntry('en/bmrc'),
			withEntry('ru/hyperquant'),
		];

		expect(entriesForLocale(entries, 'ru').map(e => e.id)).toEqual([
			'ru/bmrc',
			'ru/hyperquant',
		]);
		expect(entriesForLocale(entries, 'en').map(e => e.id)).toEqual(['en/bmrc']);
	});
});

// "Newest-first" (ticket #7): the timeline orders by the role's start date,
// descending, with the explicit `order` field breaking ties.
describe('timeline ordering', () => {
	const entries = [
		withEntry('ru/old', {
			start: '2020-01',
			order: 3,
			current: undefined,
			end: '2021-01',
		}),
		withEntry('ru/newest', { start: '2024-06', order: 2 }),
		withEntry('ru/middle', {
			start: '2022-05',
			order: 1,
			current: undefined,
			end: '2023-01',
		}),
	];

	it('sorts by start date, newest first, without mutating the input', () => {
		const ordered = sortByRecency(entries);

		expect(ordered.map(e => e.id)).toEqual([
			'ru/newest',
			'ru/middle',
			'ru/old',
		]);
		expect(entries.map(e => e.id)).toEqual([
			'ru/old',
			'ru/newest',
			'ru/middle',
		]);
	});

	it('breaks a tie on the explicit order field', () => {
		const tied = [
			withEntry('ru/second', { start: '2024-01', order: 1 }),
			withEntry('ru/first', { start: '2024-01', order: 0 }),
		];

		expect(sortByRecency(tied).map(e => e.id)).toEqual([
			'ru/first',
			'ru/second',
		]);
	});

	it('keeps the most recent entries for the highlights block', () => {
		expect(recentEntries(entries, 2).map(e => e.id)).toEqual([
			'ru/newest',
			'ru/middle',
		]);
	});
});

// The Locale switcher keeps the visitor on the same page, and pairing by slug
// is what lets a timeline entry point at its counterpart in the other Locale.
describe('slug pairing', () => {
	it('pairs entries that share a slug across Locales', () => {
		const pairs = pairBySlug([
			withEntry('ru/bmrc'),
			withEntry('en/bmrc'),
			withEntry('ru/solo'),
		]);

		expect(pairs.get('bmrc')?.ru?.id).toBe('ru/bmrc');
		expect(pairs.get('bmrc')?.en?.id).toBe('en/bmrc');
		expect(pairs.get('solo')?.en).toBeUndefined();
	});
});

describe('date formatting', () => {
	it('renders the month and year in the page Locale', () => {
		expect(
			formatPeriod({ start: '2023-07', current: true }, 'ru', 'настоящее время')
		).toBe('июль 2023 — настоящее время');
		expect(
			formatPeriod({ start: '2023-07', current: true }, 'en', 'Present')
		).toBe('July 2023 — Present');
	});

	it('renders a closed range with the end date', () => {
		expect(
			formatPeriod({ start: '2021-09', end: '2023-06' }, 'en', 'Present')
		).toBe('September 2021 — June 2023');
	});
});
