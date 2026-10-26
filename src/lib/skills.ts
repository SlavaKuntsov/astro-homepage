/**
 * The `skills` content collection (GLOSSARY: *Skill group*): the owner's skills,
 * grouped, authored as one locale-independent markdown file per group
 * (`skills/<group-id>.md`). It is the one collection that is not per-Locale
 * (ADR-0008): the technology names read the same in both Locales, so duplicating
 * them under `ru/` and `en/` would only invite drift. Only each group's *label*
 * is localized, through `t.skills.groups`, keyed by the group id.
 *
 * The id is the filename, read from the entry id rather than from frontmatter so
 * the two cannot disagree; `skillGroupIdOf` throws on an unknown name, failing
 * the build instead of rendering an unlabelled group.
 */

import { z } from 'astro/zod';
import skillOrder from '@/content/skills/order.json';
import { rankOf } from './order';

/** The known group ids; each is both a filename and a localized label key. */
export const SKILL_GROUP_IDS = [
	'languages',
	'backend',
	'databases',
	'architecture',
	'frontend',
	'devops',
	'testing',
] as const;

/** The stable id of a skill group; keys its localized label. */
export type SkillGroupId = (typeof SKILL_GROUP_IDS)[number];

/** One skill group's typed frontmatter. */
export const skillGroupSchema = z.object({
	skills: z.array(z.string().min(1)).min(1),
});

export type SkillGroupFrontmatter = z.infer<typeof skillGroupSchema>;

/** The minimal shape the helpers need; content-layer entries satisfy it. */
export interface SkillGroupEntry {
	id: string;
	data: SkillGroupFrontmatter;
}

/** The id a `skills/<id>.md` entry carries; throws on an unknown name. */
export function skillGroupIdOf(id: string): SkillGroupId {
	if ((SKILL_GROUP_IDS as readonly string[]).includes(id)) {
		return id as SkillGroupId;
	}

	throw new Error(
		`skills entry id "${id}" must be one of: ${SKILL_GROUP_IDS.join(', ')}`
	);
}

/**
 * The groups in authored order. The order comes from `skills/order.json` — one
 * list of group ids instead of an `order` field in every file — so a group not
 * yet listed sorts last, and the id breaks any remaining tie. Returns a copy.
 */
export function orderedGroups<T extends SkillGroupEntry>(
	entries: readonly T[],
	order: readonly string[] = skillOrder
): T[] {
	return [...entries].sort((a, b) => {
		const byRank = rankOf(a.id, order) - rankOf(b.id, order);
		return byRank !== 0 ? byRank : a.id.localeCompare(b.id);
	});
}
