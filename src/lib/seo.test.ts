import { describe, expect, it } from 'vitest';
import { OG_LOCALE, localeAlternates } from '@/lib/seo';

// The `hreflang` alternates (ADR-0005): every page declares its ru/en
// counterparts plus an `x-default` pointing at the default Locale. The mapping
// is the same one the Locale switcher uses, so a page's alternates and its
// switcher target can never disagree.
describe('localeAlternates', () => {
	it('links the ru/en pair and an x-default at the root', () => {
		expect(localeAlternates('/')).toEqual([
			{ hreflang: 'ru', path: '/' },
			{ hreflang: 'en', path: '/en/' },
			{ hreflang: 'x-default', path: '/' },
		]);
	});

	it('keeps a nested path on its counterpart in the other Locale', () => {
		expect(localeAlternates('/projects/astro-homepage/')).toEqual([
			{ hreflang: 'ru', path: '/projects/astro-homepage/' },
			{ hreflang: 'en', path: '/en/projects/astro-homepage/' },
			{ hreflang: 'x-default', path: '/projects/astro-homepage/' },
		]);
	});

	it('strips the /en prefix when an EN page names its RU counterpart', () => {
		expect(localeAlternates('/en/arts/')).toEqual([
			{ hreflang: 'ru', path: '/arts/' },
			{ hreflang: 'en', path: '/en/arts/' },
			{ hreflang: 'x-default', path: '/arts/' },
		]);
	});

	// Astro builds directory-format URLs, so each alternate must equal the
	// counterpart page's own canonical (`…/`, never the slash-free nav form).
	it('always returns directory-format paths', () => {
		for (const { path } of localeAlternates('/en/projects/private-crm/')) {
			expect(path.endsWith('/')).toBe(true);
		}
	});
});

// Open Graph names Locales `language_TERRITORY`, not `ru`/`en`; one map bridges
// the Site's Locale type and `og:locale`.
describe('OG_LOCALE', () => {
	it('maps each Locale to its Open Graph tag', () => {
		expect(OG_LOCALE).toEqual({ ru: 'ru_RU', en: 'en_US' });
	});
});
