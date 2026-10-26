import { describe, expect, it } from 'vitest';
import { SKILL_GROUPS, type SkillGroupId } from '@/lib/skills';

// The Resume's skills, grouped for display. The technology names are
// locale-independent; only each group's label is translated (`t.skills.groups`),
// keyed by the group id. These tests keep the data and the id union in step so a
// group can never render unlabelled or empty.
const ALL_GROUPS: SkillGroupId[] = [
	'languages',
	'backend',
	'databases',
	'architecture',
	'frontend',
	'devops',
	'testing',
];

describe('skill groups', () => {
	it('covers every declared group exactly once', () => {
		expect(SKILL_GROUPS.map(group => group.id)).toEqual(ALL_GROUPS);
	});

	it('gives every group at least one skill', () => {
		for (const group of SKILL_GROUPS) {
			expect(group.skills.length).toBeGreaterThan(0);
			for (const skill of group.skills) expect(skill).not.toBe('');
		}
	});

	it('never repeats a skill across groups', () => {
		const all = SKILL_GROUPS.flatMap(group => group.skills);

		expect(new Set(all).size).toBe(all.length);
	});
});
