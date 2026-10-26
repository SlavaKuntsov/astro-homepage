/**
 * Ordering content by an authored manifest (ADR-0009): a list of keys — group
 * ids for `skills`, slugs for `experience` — instead of an `order` field in every
 * file. Shared by both collections so the rule lives once.
 */

/**
 * The position of `key` in the authored `order`. A key that is not listed sorts
 * after every listed one (`order.length`), and the caller's tie-break keeps the
 * result stable.
 */
export function rankOf(key: string, order: readonly string[]): number {
	const index = order.indexOf(key);
	return index === -1 ? order.length : index;
}
