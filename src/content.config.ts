import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { artworkSchema } from './lib/arts';
import { educationSchema } from './lib/education';
import { experienceSchema } from './lib/experience';
import { projectSchema } from './lib/projects';
import { skillGroupSchema } from './lib/skills';

// ADR-0004: one markdown file per Locale under `experience/{ru,en}/<slug>.md`.
// The Zod schema (`src/lib/experience.ts`) fails the build on a missing or
// mistyped field, so the Resume can never render untyped. The Locale and slug
// come from the path, so the two locale files pair by filename.
const experience = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
	schema: experienceSchema,
});

// ADR-0004: one markdown file per Locale under `education/{ru,en}/<slug>.md`.
// The Zod schema (`src/lib/education.ts`) fails the build on a missing or
// mistyped field; entries are dated by year. The home page renders them in
// `education/order.json` order (ADR-0009).
const education = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/education' }),
	schema: educationSchema,
});

// ADR-0008: the one locale-independent collection — the technology names read
// the same in both Locales, so a group is a single markdown file and only its
// label is localized. The id is the filename, validated by `skillGroupIdOf`.
const skills = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/skills' }),
	schema: skillGroupSchema,
});

// ADR-0004: one markdown file per Locale under `projects/{ru,en}/<slug>.md`.
// The schema (`src/lib/projects.ts`) fails the build on bad frontmatter and on
// a `githubRepo` that contradicts `visibility`; a public Project may then be
// enriched from GitHub at build time (`src/lib/enrichment.ts`).
const projects = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
	schema: projectSchema,
});

// ADR-0004: one markdown file per Locale under `arts/{ru,en}/<slug>.md`. The
// schema (`src/lib/arts.ts`) fails the build on bad frontmatter and resolves the
// Artwork's image to typed metadata through the loader's `image()` helper, so
// `<Picture>` can optimize it; the gallery (ticket #10) renders the Artworks in
// `arts/order.json` order (ADR-0009).
const arts = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/arts' }),
	schema: ({ image }) => artworkSchema(image),
});

export const collections = { experience, education, skills, projects, arts };
