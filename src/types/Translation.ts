import type { ContactKind } from '@/lib/contacts';
import type { SkillGroupId } from '@/lib/skills';

/** The metadata a page emits: its `<title>` and `<meta name="description">`. */
export interface PageMeta {
	title: string;
	description: string;
}

export interface Translation {
	a11y: {
		skipToContent: string;
		primaryNavigation: string;
		mobileNavigation: string;
		openMenu: string;
		closeMenu: string;
		switchTheme: string;
		switchToDarkTheme: string;
		switchToLightTheme: string;
		/** Names the Locale this page's switcher leads to (ADR-0011). */
		switchLocale: string;
	};
	site: {
		/** The owner's name as written in this Locale. */
		ownerName: string;
	};
	/**
	 * Per-page, per-Locale SEO metadata (ticket #13). `siteName` is the Site
	 * identity for `og:site_name` and a detail page's title suffix; each page
	 * block is the literal `<title>`/description that page emits.
	 */
	meta: {
		siteName: string;
		home: PageMeta;
		experience: PageMeta;
		projects: PageMeta;
		arts: PageMeta;
	};
	nav: {
		home: string;
		experience: string;
		projects: string;
		arts: string;
		source: string;
	};
	footer: {
		builtWithAstro: string;
	};
	index: {
		heading: {
			greeting: string;
			name: string;
			position: string;
		};
		main: {
			h_about: string;
			about: string;
			/** The owner's natural-language proficiency, e.g. "Languages: …". */
			languages: string;
		};
	};
	projects: {
		/** The `/projects` index page's `<h1>`. */
		heading: string;
		/** Link from an index card to the Project's detail page. */
		viewProject: string;
		/** Link from a detail page back to the index. */
		back: string;
		/** Accessible label for a Project's tag chips (the repo's topics). */
		tags: string;
		/** Accessible label for a Project's image gallery. */
		gallery: string;
		/** Link label for the live site. */
		live: string;
		/** Link label for the source repository. */
		source: string;
		/** Link label for any other Project link. */
		other: string;
		/** Label for the Enrichment star count on an index card. */
		stars: string;
		/** Label for the Enrichment language breakdown. */
		languages: string;
	};
	arts: {
		/** The page's `<h1>`. */
		heading: string;
		/** Accessible label for the Artwork gallery grid. */
		gallery: string;
		/** Accessible label for an Artwork's tag chips. */
		tags: string;
		/** Link label for an Artwork's external page. */
		link: string;
		/** Accessible label for the lightbox's close button. */
		closeLightbox: string;
		/** Accessible label for a "previous Artwork" control. */
		previous: string;
		/** Accessible label for a "next Artwork" control. */
		next: string;
	};
	experience: {
		/** The `/experience` page's `<h1>`. */
		heading: string;
		/** Labels an ongoing role in the timeline, e.g. "Present". */
		present: string;
		/** Heading of the home highlights block. */
		highlightsHeading: string;
		/** Link from the highlights block to the full `/experience` page. */
		viewAll: string;
		/** Tail shown when the highlights block omits older roles, e.g. "и т.д.". */
		more: string;
		/** Accessible label for an entry's technology chips. */
		environment: string;
		/** Label for an entry's industries line. */
		industries: string;
	};
	education: {
		/** The home page's education section `<h2>`. */
		heading: string;
	};
	skills: {
		/** The Skills section's `<h2>`. */
		heading: string;
		/** Localized label per skill group; keys mirror `SKILL_GROUPS`. */
		groups: Record<SkillGroupId, string>;
	};
	contacts: {
		/** The Contacts section's `<h2>`. */
		heading: string;
		/** The "Download CV" action label. */
		downloadCv: string;
		/** Localized label per contact kind; keys mirror `CONTACT_LINKS`. */
		labels: Record<ContactKind, string>;
	};
}
