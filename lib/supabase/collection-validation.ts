import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A published collection must not be a public dead end — at least one of
 * its associated products must actually be published right now. The
 * client's own picker only reflects what it fetched at open time, so this
 * re-checks the real, current status server-side rather than trusting
 * whatever status the payload's product rows happened to carry (Phase L.1
 * §21). Draft-only associations are fine for a draft collection.
 */
export async function hasAtLeastOnePublishedProduct(
  supabase: SupabaseClient,
  productIds: string[]
): Promise<boolean> {
  if (productIds.length === 0) return false;
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .in('id', productIds)
    .eq('status', 'published');
  return (count ?? 0) > 0;
}
