import type { ContactKind } from '@/lib/contacts';
import type { SkillGroupId } from '@/lib/skills';

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
		/** Names the Locale this page's switcher leads to (ADR-0005). */
		switchLocale: string;
	};
	site: {
		/** The owner's name as written in this Locale. */
		ownerName: string;
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
		};
	};
	projects: {
		/** The `/projects` index page's `<h1>`. */
		heading: string;
		/** Link from an index card to the Project's detail page. */
		viewProject: string;
		/** Link from a detail page back to the index. */
		back: string;
		/** Label for a Project's technology chips. */
		stack: string;
		/** Accessible label for a Project's image gallery. */
		gallery: string;
		/** Link label for the live site. */
		live: string;
		/** Link label for the source repository. */
		source: string;
		/** Link label for any other Project link. */
		other: string;
		/** Label for the Enrichment star count. */
		stars: string;
		/** Label for the Enrichment primary language. */
		language: string;
		/** Label for the Enrichment repository description. */
		repository: string;
	};
	arts: {
		/** The page's `<h1>`. */
		heading: string;
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
		/** Accessible label for an entry's technology chips. */
		environment: string;
		/** Label for an entry's industries line. */
		industries: string;
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
