import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	orderedGroups,
	skillGroupIdOf,
	skillGroupSchema,
	SKILL_GROUP_IDS,
	type SkillGroupFrontmatter,
} from '@/lib/skills';

// The `skills` collection is the one collection that is not per-Locale
// (ADR-0008): its Zod schema is enforced at build, and its pure helpers turn
// raw entries into ordered, display-ready groups. These tests pin the schema
// rules the markdown files rely on and the id/order rules the section relies on.
const validGroup = { order: 0, skills: ['C#', 'PostgreSQL'] };

const withGroup = (
	id: string,
	overrides: Partial<SkillGroupFrontmatter> = {}
) => ({ id, data: { ...validGroup, ...overrides } });

describe('skills schema', () => {
	it('accepts a complete group', () => {
		expect(skillGroupSchema.safeParse(validGroup).success).toBe(true);
	});

	it('rejects an empty skill list', () => {
		expect(skillGroupSchema.safeParse({ ...validGroup, skills: [] }).success).toBe(
			false
		);
	});

	it('rejects a blank skill', () => {
		expect(
			skillGroupSchema.safeParse({ ...validGroup, skills: [''] }).success
		).toBe(false);
	});

	it('rejects a non-integer order', () => {
		expect(
			skillGroupSchema.safeParse({ ...validGroup, order: 1.5 }).success
		).toBe(false);
	});

	it('rejects a missing field', () => {
		const { order, ...rest } = validGroup;

		expect(skillGroupSchema.safeParse(rest).success).toBe(false);
	});
});

// The group id is the filename (`skills/<id>.md`), so it is read from the entry
// id rather than frontmatter; an unknown name must fail the build instead of
// rendering an unlabelled group.
describe('group id parsing', () => {
	it('accepts a known id', () => {
		expect(skillGroupIdOf('backend')).toBe('backend');
	});

	it('fails loudly on an unknown id', () => {
		expect(() => skillGroupIdOf('nope')).toThrow(/must be one of/);
	});
});

describe('group ordering', () => {
	const groups = [
		withGroup('testing', { order: 6 }),
		withGroup('languages', { order: 0 }),
		withGroup('devops', { order: 5 }),
	];

	it('sorts by order, ascending, without mutating the input', () => {
		expect(orderedGroups(groups).map(group => group.id)).toEqual([
			'languages',
			'devops',
			'testing',
		]);
		expect(groups.map(group => group.id)).toEqual([
			'testing',
			'languages',
			'devops',
		]);
	});

	it('breaks a tie on the id', () => {
		const tied = [
			withGroup('frontend', { order: 1 }),
			withGroup('backend', { order: 1 }),
		];

		expect(orderedGroups(tied).map(group => group.id)).toEqual([
			'backend',
			'frontend',
		]);
	});
});

// Every declared group must be authored: a group id with no markdown file would
// silently vanish from the page, so it is pinned here.
describe('content coverage', () => {
	it('has one markdown file per declared group id', () => {
		const dir = fileURLToPath(new URL('../content/skills', import.meta.url));
		const files = readdirSync(dir)
			.filter(name => name.endsWith('.md'))
			.map(name => name.replace(/\.md$/, ''));

		expect(new Set(files)).toEqual(new Set(SKILL_GROUP_IDS));
	});
});
