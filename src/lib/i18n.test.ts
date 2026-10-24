import { describe, expect, it } from 'vitest';
import { localeOf, localizePath } from '@/lib/i18n';

// Locale routing (ADR-0005): the default Locale `ru` is served unprefixed and
// `en` under `/en/`. Every server-rendered Locale decision — the switcher href,
// the navigation hrefs — derives from these helpers, so one rule serves them
// all.
describe('localeOf', () => {
	it('serves the root and unprefixed paths in the default Locale', () => {
		expect(localeOf('/')).toBe('ru');
		expect(localeOf('/works')).toBe('ru');
		expect(localeOf('/projects/x')).toBe('ru');
	});

	it('serves /en and everything below it in en', () => {
		expect(localeOf('/en')).toBe('en');
		expect(localeOf('/en/')).toBe('en');
		expect(localeOf('/en/works')).toBe('en');
		expect(localeOf('/en/projects/x')).toBe('en');
	});

	it('matches the prefix only on a path boundary', () => {
		expect(localeOf('/enterprise')).toBe('ru');
		expect(localeOf('/enough')).toBe('ru');
	});
});

// The switcher maps the current path onto the other Locale; at the root that
// is `/` ↔ `/en` (ADR-0005: RU lives at the unprefixed root).
describe('localizePath at the root', () => {
	it('maps / onto the unprefixed root in ru', () => {
		expect(localizePath('/', 'ru')).toBe('/');
	});

	it('maps / onto /en in en', () => {
		expect(localizePath('/', 'en')).toBe('/en');
	});

	it('strips the prefix when /en comes back to ru', () => {
		expect(localizePath('/en', 'ru')).toBe('/');
		expect(localizePath('/en/', 'ru')).toBe('/');
	});
});

// The switcher keeps the visitor on the same page (spec user story 10): a
// nested path maps onto its exact counterpart under the other Locale.
describe('localizePath on nested paths', () => {
	it('adds the prefix when a ru path moves to en', () => {
		expect(localizePath('/projects/x', 'en')).toBe('/en/projects/x');
		expect(localizePath('/works', 'en')).toBe('/en/works');
	});

	it('strips the prefix when an en path moves back to ru', () => {
		expect(localizePath('/en/projects/x', 'ru')).toBe('/projects/x');
		expect(localizePath('/en/works', 'ru')).toBe('/works');
	});

	it('leaves a path alone when it is already in the target Locale', () => {
		expect(localizePath('/projects/x', 'ru')).toBe('/projects/x');
		expect(localizePath('/en/projects/x', 'en')).toBe('/en/projects/x');
	});

	it('prefixes the whole path, never a fragment of the first segment', () => {
		expect(localizePath('/enterprise', 'en')).toBe('/en/enterprise');
	});
});

// The ticket's contract: switching away and back must return the visitor to
// where they started, whatever the path.
describe('localizePath round-trips', () => {
	const PATHS = [
		'/',
		'/works',
		'/arts',
		'/projects/x',
		'/projects/x/deep',
		'/enterprise',
		'/en',
		'/en/works',
		'/en/projects/x',
	];

	for (const path of PATHS) {
		it(`round-trips ${path} through a Locale switch and back`, () => {
			const home = localeOf(path);
			const away = home === 'ru' ? 'en' : 'ru';

			expect(localizePath(localizePath(path, away), home)).toBe(path);
		});
	}

	it('round-trips a trailing-slash path to its normalized form', () => {
		expect(localizePath(localizePath('/en/works/', 'ru'), 'en')).toBe(
			'/en/works'
		);
	});
});
