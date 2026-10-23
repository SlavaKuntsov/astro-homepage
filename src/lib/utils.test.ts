import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

// The first pure-logic example, so the Vitest harness asserts something real
// rather than proving itself. Later tickets add content-schema and locale
// path-mapping tests at the same seam.
describe('cn', () => {
	it('keeps the last conflicting Tailwind utility', () => {
		expect(cn('p-2', 'p-4')).toBe('p-4');
	});

	it('drops falsy conditional values', () => {
		expect(cn('block', false, undefined, null)).toBe('block');
	});
});
