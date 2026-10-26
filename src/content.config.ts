import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { experienceSchema } from './lib/experience';
import { skillGroupSchema } from './lib/skills';

// ADR-0004: one markdown file per Locale under `experience/{ru,en}/<slug>.md`.
// The Zod schema (`src/lib/experience.ts`) fails the build on a missing or
// mistyped field, so the Resume can never render untyped. The Locale and slug
// come from the path, so the two locale files pair by filename.
const experience = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
	schema: experienceSchema,
});

// ADR-0008: the one locale-independent collection — the technology names read
// the same in both Locales, so a group is a single markdown file and only its
// label is localized. The id is the filename, validated by `skillGroupIdOf`.
const skills = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/skills' }),
	schema: skillGroupSchema,
});

export const collections = { experience, skills };
