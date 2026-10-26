import { describe, expect, it } from 'vitest';
import {
	CONTACT_LINKS,
	CV_DOWNLOAD_HREF,
	contactLinkAttrs,
	isExternalHref,
	type ContactKind,
} from '@/lib/contacts';

// The owner's contact targets are locale-independent and shared by the Footer,
// the Contacts section (ticket #8), and the CV page, so the addresses and URLs
// live in exactly one place. These tests pin that list; the *labels* are
// localized through the Translation tables and asserted at the rendered seam
// (`e2e/skills-contacts.spec.ts`).
const REQUIRED: ContactKind[] = ['email', 'github', 'telegram', 'instagram'];

describe('contact links', () => {
	it('offers exactly the four ways to reach the owner', () => {
		expect(CONTACT_LINKS.map(link => link.kind)).toEqual(REQUIRED);
	});

	it('gives every contact a non-empty target and detail', () => {
		for (const link of CONTACT_LINKS) {
			expect(link.href).toMatch(/^(https:\/\/|mailto:)/);
			expect(link.detail).not.toBe('');
		}
	});

	it('reaches the owner by email through a mailto: link', () => {
		const email = CONTACT_LINKS.find(link => link.kind === 'email');

		expect(email?.href).toMatch(/^mailto:[^@\s]+@[^@\s]+$/);
	});

	it('points the CV action at the static PDF', () => {
		expect(CV_DOWNLOAD_HREF).toBe('/resume.pdf');
	});
});

describe('isExternalHref', () => {
	it('treats web links as external and mailto: links as not', () => {
		expect(isExternalHref('https://t.me/slava_kunz')).toBe(true);
		expect(isExternalHref('mailto:kuncovs19@gmail.com')).toBe(false);
	});
});

describe('contactLinkAttrs', () => {
	it('opens web links in a new tab and drops the referrer', () => {
		expect(
			contactLinkAttrs({ kind: 'github', href: 'https://github.com/x', detail: '' })
		).toEqual({ target: '_blank', rel: 'me noopener noreferrer' });
	});

	it('leaves a mailto: link in place', () => {
		expect(
			contactLinkAttrs({ kind: 'email', href: 'mailto:a@b.c', detail: '' })
		).toEqual({});
	});
});
