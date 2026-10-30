import { describe, expect, it } from 'vitest';
import { localeOf, localizePath } from '@/lib/i18n';

// Locale routing (ADR-0011): the default Locale `en` is served unprefixed and
// `ru` under `/ru/`. Every server-rendered Locale decision — the switcher href,
// the navigation hrefs — derives from these helpers, so one rule serves them
// all.
describe('localeOf', () => {
	it('serves the root and unprefixed paths in the default Locale', () => {
		expect(localeOf('/')).toBe('en');
		expect(localeOf('/projects')).toBe('en');
		expect(localeOf('/projects/x')).toBe('en');
	});

	it('serves /ru and everything below it in ru', () => {
		expect(localeOf('/ru')).toBe('ru');
		expect(localeOf('/ru/')).toBe('ru');
		expect(localeOf('/ru/projects')).toBe('ru');
		expect(localeOf('/ru/projects/x')).toBe('ru');
	});

	it('matches the prefix only on a path boundary', () => {
		expect(localeOf('/russia')).toBe('en');
		expect(localeOf('/enterprise')).toBe('en');
	});
});

// The switcher maps the current path onto the other Locale; at the root that
// is `/` ↔ `/ru` (ADR-0011: EN lives at the unprefixed root).
describe('localizePath at the root', () => {
	it('maps / onto the unprefixed root in en', () => {
		expect(localizePath('/', 'en')).toBe('/');
	});

	it('maps / onto /ru in ru', () => {
		expect(localizePath('/', 'ru')).toBe('/ru');
	});

	it('strips the prefix when /ru comes back to en', () => {
		expect(localizePath('/ru', 'en')).toBe('/');
		expect(localizePath('/ru/', 'en')).toBe('/');
	});
});

// The switcher keeps the visitor on the same page (spec user story 10): a
// nested path maps onto its exact counterpart under the other Locale.
describe('localizePath on nested paths', () => {
	it('adds the prefix when an en path moves to ru', () => {
		expect(localizePath('/projects/x', 'ru')).toBe('/ru/projects/x');
		expect(localizePath('/projects', 'ru')).toBe('/ru/projects');
	});

	it('strips the prefix when a ru path moves back to en', () => {
		expect(localizePath('/ru/projects/x', 'en')).toBe('/projects/x');
		expect(localizePath('/ru/projects', 'en')).toBe('/projects');
	});

	it('leaves a path alone when it is already in the target Locale', () => {
		expect(localizePath('/projects/x', 'en')).toBe('/projects/x');
		expect(localizePath('/ru/projects/x', 'ru')).toBe('/ru/projects/x');
	});

	it('prefixes the whole path, never a fragment of the first segment', () => {
		expect(localizePath('/enterprise', 'ru')).toBe('/ru/enterprise');
	});
});

// The ticket's contract: switching away and back must return the visitor to
// where they started, whatever the path.
describe('localizePath round-trips', () => {
	const PATHS = [
		'/',
		'/projects',
		'/arts',
		'/projects/x',
		'/projects/x/deep',
		'/enterprise',
		'/ru',
		'/ru/projects',
		'/ru/projects/x',
	];

	for (const path of PATHS) {
		it(`round-trips ${path} through a Locale switch and back`, () => {
			const home = localeOf(path);
			const away = home === 'ru' ? 'en' : 'ru';

			expect(localizePath(localizePath(path, away), home)).toBe(path);
		});
	}

	it('round-trips a trailing-slash path to its normalized form', () => {
		expect(localizePath(localizePath('/ru/projects/', 'en'), 'ru')).toBe(
			'/ru/projects'
		);
	});
});
