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
		works: string;
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
			h_web: string;
		};
	};
	works: {
		/** The page's `<h1>`. */
		heading: string;
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
}
