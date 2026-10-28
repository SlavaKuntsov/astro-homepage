import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import educationOrder from '@/content/education/order.json';
import {
	educationSchema,
	formatYearPeriod,
	orderedEducation,
	type EducationEntry,
	type EducationFrontmatter,
} from '@/lib/education';

// The `education` collection's frontmatter is enforced at build (ADR-0004): a
// mistyped or missing field must fail, so the home page's education section can
// never render untyped. These tests pin the schema rules the markdown files use.
const validEntry = {
	institution: 'Белорусский государственный технологический университет',
	level: 'Высшее',
	start: '2022',
	end: '2026',
};

const withEntry = (
	id: string,
	overrides: Partial<EducationFrontmatter> = {}
): EducationEntry => ({
	id,
	data: { ...validEntry, ...overrides },
});

describe('education schema', () => {
	it('accepts a complete entry', () => {
		expect(educationSchema.safeParse(validEntry).success).toBe(true);
	});

	it('accepts the optional fields', () => {
		const full = {
			...validEntry,
			institutionUrl: 'https://belstu.by',
			faculty: 'Факультет информационных технологий',
			field: 'Программное обеспечение информационной безопасности',
			location: 'Минск',
		};

		expect(educationSchema.safeParse(full).success).toBe(true);
	});

	it('accepts a numeric year as YAML parses an unquoted year', () => {
		const numeric = { ...validEntry, start: 2022, end: 2026 };

		expect(educationSchema.safeParse(numeric).success).toBe(true);
	});

	it('accepts an ongoing degree flagged current', () => {
		const ongoing = { ...validEntry, end: undefined, current: true };

		expect(educationSchema.safeParse(ongoing).success).toBe(true);
	});

	it('rejects an entry missing a required field', () => {
		const { institution, ...rest } = validEntry;

		expect(educationSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects an entry with neither an end year nor the current flag', () => {
		const { end, ...rest } = validEntry;

		expect(educationSchema.safeParse(rest).success).toBe(false);
	});

	it('rejects a malformed year', () => {
		const bad = { ...validEntry, start: '2022-09' };

		expect(educationSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects an entry that is both current and closed', () => {
		const contradictory = { ...validEntry, current: true };

		expect(educationSchema.safeParse(contradictory).success).toBe(false);
	});

	it('rejects an end year that precedes the start', () => {
		const backwards = { ...validEntry, start: '2026', end: '2022' };

		expect(educationSchema.safeParse(backwards).success).toBe(false);
	});
});

// "Newest-first": the order is authored explicitly in `education/order.json`
// (ADR-0009) — one list of slugs instead of an `order` field in every file.
describe('education ordering', () => {
	const entries = [
		withEntry('ru/older', { start: '2018', end: '2022' }),
		withEntry('ru/newest', { start: '2022', end: '2026' }),
		withEntry('ru/middle', { start: '2020', end: '2024' }),
	];

	it('follows the authored order, without mutating the input', () => {
		const ordered = orderedEducation(entries, ['newest', 'middle', 'older']);

		expect(ordered.map(e => e.id)).toEqual([
			'ru/newest',
			'ru/middle',
			'ru/older',
		]);
		expect(entries.map(e => e.id)).toEqual([
			'ru/older',
			'ru/newest',
			'ru/middle',
		]);
	});

	it('sorts a slug absent from the list after the listed ones', () => {
		expect(orderedEducation(entries, ['newest']).map(e => e.id)).toEqual([
			'ru/newest',
			'ru/middle',
			'ru/older',
		]);
	});
});

// Every entry must be listed: a slug with no manifest entry would silently drop
// to the end of the section, so the list and the content files stay in step.
describe('order manifest', () => {
	it('lists every education slug exactly once', () => {
		const dir = fileURLToPath(new URL('../content/education/ru', import.meta.url));
		const slugs = readdirSync(dir)
			.filter(name => name.endsWith('.md'))
			.map(name => name.replace(/\.md$/, ''));

		expect(new Set(educationOrder)).toEqual(new Set(slugs));
	});
});

describe('year formatting', () => {
	it('renders a range with both years', () => {
		expect(formatYearPeriod({ start: '2022', end: '2026' }, 'Present')).toBe(
			'2022 — 2026'
		);
	});

	it('renders a single year when start and end match', () => {
		expect(formatYearPeriod({ start: '2026', end: '2026' }, 'Present')).toBe(
			'2026'
		);
	});

	it('renders an ongoing degree with the localized present word', () => {
		expect(formatYearPeriod({ start: '2024', current: true }, 'настоящее время')).toBe(
			'2024 — настоящее время'
		);
	});
});
