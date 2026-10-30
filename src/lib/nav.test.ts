import { describe, expect, it } from 'vitest';
import { isActivePath } from '@/lib/nav';

// Navigation highlighting is shared by the server render and the client-side
// re-sync after a View Transition (the persisted header does not re-render), so
// the comparison rules live in one pure helper.
describe('isActivePath', () => {
	it('marks the root link active only on the root path', () => {
		expect(isActivePath('/', '/')).toBe(true);
		expect(isActivePath('/arts', '/')).toBe(false);
	});

	it('marks each Locale root link active only on its own root', () => {
		expect(isActivePath('/ru', '/ru')).toBe(true);
		expect(isActivePath('/ru/projects', '/ru')).toBe(false);
		expect(isActivePath('/ru/arts', '/ru')).toBe(false);
		expect(isActivePath('/ru', '/')).toBe(false);
		expect(isActivePath('/projects', '/ru')).toBe(false);
	});

	it('ignores trailing slashes on both sides', () => {
		expect(isActivePath('/arts/', '/arts')).toBe(true);
		expect(isActivePath('/arts', '/arts/')).toBe(true);
		expect(isActivePath('/', '/')).toBe(true);
	});

	it('keeps a section link active on its nested routes', () => {
		expect(isActivePath('/projects', '/projects')).toBe(true);
		expect(isActivePath('/projects/foo', '/projects')).toBe(true);
		expect(isActivePath('/projects/foo/bar', '/projects')).toBe(true);
	});

	it('does not match a path that only shares a prefix', () => {
		expect(isActivePath('/arts-and-crafts', '/arts')).toBe(false);
	});

	it('never marks an external link active', () => {
		expect(
			isActivePath('/arts', 'https://github.com/SlavaKuntsov/astro-homepage')
		).toBe(false);
	});
});
