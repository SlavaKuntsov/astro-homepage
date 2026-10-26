import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import skillOrder from '@/content/skills/order.json';
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
const validGroup = { skills: ['C#', 'PostgreSQL'] };

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

	it('rejects a missing field', () => {
		expect(skillGroupSchema.safeParse({}).success).toBe(false);
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

// The order comes from `skills/order.json` (ADR-0009) — one list of group ids
// instead of an `order` field in every file.
describe('group ordering', () => {
	const groups = [
		withGroup('testing'),
		withGroup('languages'),
		withGroup('devops'),
	];

	it('follows the authored order, without mutating the input', () => {
		expect(
			orderedGroups(groups, ['languages', 'devops', 'testing']).map(g => g.id)
		).toEqual(['languages', 'devops', 'testing']);
		expect(groups.map(g => g.id)).toEqual(['testing', 'languages', 'devops']);
	});

	it('sorts a group absent from the list after the listed ones', () => {
		expect(orderedGroups(groups, ['languages']).map(g => g.id)).toEqual([
			'languages',
			'devops',
			'testing',
		]);
	});
});

// Every declared group must be authored and listed: a group id with no file
// would vanish, and one missing from the manifest would drop to the end.
describe('content coverage', () => {
	const filesOnDisk = () => {
		const dir = fileURLToPath(new URL('../content/skills', import.meta.url));

		return readdirSync(dir)
			.filter(name => name.endsWith('.md'))
			.map(name => name.replace(/\.md$/, ''));
	};

	it('has one markdown file per declared group id', () => {
		expect(new Set(filesOnDisk())).toEqual(new Set(SKILL_GROUP_IDS));
	});

	it('lists every declared group in the order manifest exactly once', () => {
		expect(new Set(skillOrder)).toEqual(new Set(SKILL_GROUP_IDS));
	});
});
