/**
 * customer_cart_items.product_id/variant_id and customer_wishlist_items.
 * product_id are UUID columns — a malformed localStorage row (e.g.
 * productId: "banana") passes basic string/quantity checks but fails the
 * Supabase upsert outright, and an unchecked `.upsert()` failure currently
 * means the WHOLE batch (including otherwise-valid rows) is rejected.
 * Accepts any RFC4122-shaped UUID (8-4-4-4-12 hex), not just v4 — nothing
 * in this schema requires a specific version.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
