import { describe, expect, it } from 'vitest';
import { OG_LOCALE, localeAlternates } from '@/lib/seo';

// The `hreflang` alternates (ADR-0011): every page declares its ru/en
// counterparts plus an `x-default` pointing at the default Locale. The mapping
// is the same one the Locale switcher uses, so a page's alternates and its
// switcher target can never disagree.
describe('localeAlternates', () => {
	it('links the ru/en pair and an x-default at the root', () => {
		expect(localeAlternates('/')).toEqual([
			{ hreflang: 'ru', path: '/ru/' },
			{ hreflang: 'en', path: '/' },
			{ hreflang: 'x-default', path: '/' },
		]);
	});

	it('keeps a nested path on its counterpart in the other Locale', () => {
		expect(localeAlternates('/projects/astro-homepage/')).toEqual([
			{ hreflang: 'ru', path: '/ru/projects/astro-homepage/' },
			{ hreflang: 'en', path: '/projects/astro-homepage/' },
			{ hreflang: 'x-default', path: '/projects/astro-homepage/' },
		]);
	});

	it('strips the /ru prefix when a RU page names its EN counterpart', () => {
		expect(localeAlternates('/ru/arts/')).toEqual([
			{ hreflang: 'ru', path: '/ru/arts/' },
			{ hreflang: 'en', path: '/arts/' },
			{ hreflang: 'x-default', path: '/arts/' },
		]);
	});

	// Astro builds directory-format URLs, so each alternate must equal the
	// counterpart page's own canonical (`…/`, never the slash-free nav form).
	it('always returns directory-format paths', () => {
		for (const { path } of localeAlternates('/projects/private-crm/')) {
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
