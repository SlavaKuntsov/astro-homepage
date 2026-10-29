/**
 * The owner's contact links — the single, locale-independent source of the
 * targets shown in the Footer and the Contacts section (ticket #8). Only the
 * URLs and handles live here; the visible labels are localized
 * in the Translation tables (`t.contacts.labels`), keyed by `kind`, so no
 * component hard-codes an address.
 */

/** The owner's email, kept in one place so the `mailto:` and its display agree. */
const EMAIL_ADDRESS = 'kuncovs19@gmail.com';

/** One way to reach the owner; `kind` keys the localized label. */
export type ContactKind = 'email' | 'github' | 'telegram' | 'instagram';

export interface Contact {
	kind: ContactKind;
	href: string;
	/** Locale-independent text shown beside the label: an @handle, or the address. */
	detail: string;
}

export const CONTACT_LINKS: readonly Contact[] = [
	{
		kind: 'email',
		href: `mailto:${EMAIL_ADDRESS}`,
		detail: EMAIL_ADDRESS,
	},
	{
		kind: 'github',
		href: 'https://github.com/SlavaKuntsov',
		detail: '@SlavaKuntsov',
	},
	{
		kind: 'telegram',
		href: 'https://t.me/slava_kunz',
		detail: '@slava_kunz',
	},
	{
		kind: 'instagram',
		href: 'https://www.instagram.com/slava_kunz_',
		detail: '@slava_kunz_',
	},
];

/** The static PDF the "Download CV" action points at (provided by ticket #10). */
export const CV_DOWNLOAD_HREF = '/resume.pdf';

/** Whether a link leaves the Site, and so should open in a new tab. */
export function isExternalHref(href: string): boolean {
	return /^https?:\/\//.test(href);
}

/**
 * The `target`/`rel` a contact link needs: web links open in a new tab and drop
 * the referrer, while `mailto:` links stay in place. Kept here so the Footer
 * and the Contacts section share one policy.
 */
export function contactLinkAttrs(contact: Contact): {
	target?: string;
	rel?: string;
} {
	return isExternalHref(contact.href)
		? { target: '_blank', rel: 'me noopener noreferrer' }
		: {};
}
