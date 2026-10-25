import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { experienceSchema } from './lib/experience';

// ADR-0004: one markdown file per Locale under `experience/{ru,en}/<slug>.md`.
// The Zod schema (`src/lib/experience.ts`) fails the build on a missing or
// mistyped field, so the Resume can never render untyped. The Locale and slug
// come from the path, so the two locale files pair by filename.
const experience = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
	schema: experienceSchema,
});

export const collections = { experience };
