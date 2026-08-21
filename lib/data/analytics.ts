import { createBrowserClient } from '@/lib/supabase/client';
import { normalizeSearchString } from '@/lib/utils/search-utils';

export type CatalogEventType = 'product_view' | 'add_to_cart' | 'whatsapp_click' | 'restock_interest';

/**
 * Enregistre un événement anonyme d'interaction catalogue.
 * Strictement anonyme (sans IP ni empreinte navigateur).
 */
export async function trackCatalogEvent(eventType: CatalogEventType, productId?: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    const supabase = createBrowserClient();
    await supabase.from('catalog_events').insert({
      event_type: eventType,
      product_id: productId || null,
    });
  } catch (err) {
    // Analytics silencieux sans blocage UI
    console.debug('[trackCatalogEvent]', err);
  }
}

/**
 * Enregistre une recherche réellement soumise par l'utilisateur.
 */
export async function trackCommittedSearch(query: string, resultCount = 0) {
  if (!query || !query.trim()) return;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    const supabase = createBrowserClient();
    const normalized = normalizeSearchString(query);

    await supabase.from('search_events').insert({
      query: query.trim(),
      normalized_query: normalized,
      result_count: resultCount,
    });
  } catch (err) {
    console.debug('[trackCommittedSearch]', err);
  }
}
