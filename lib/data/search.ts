/**
 * Repository recherche + tracking anonyme des événements de recherche.
 */

import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSeedQuery as normalizeQuery } from '@/lib/dev/seed-products';

/**
 * Enregistre anonymement un événement de recherche.
 * N'échoue jamais silencieusement (ne bloque pas l'UX).
 */
export async function trackSearchEvent(query: string, resultCount: number): Promise<void> {
  if (shouldUseSeedData() || !query.trim()) return;

  try {
    const supabase = createServerClient();
    await supabase.from('search_events').insert({
      query: query.trim(),
      normalized_query: normalizeQuery(query),
      result_count: resultCount,
    });
  } catch {
    // Tracking silencieux — ne jamais bloquer l'UX
  }
}

/**
 * Enregistre une demande d'ouvrage (avant ouverture WhatsApp).
 * N'échoue jamais silencieusement.
 */
export async function trackBookRequest(query: string, source = 'catalogue'): Promise<void> {
  if (shouldUseSeedData() || !query.trim()) return;

  try {
    const supabase = createServerClient();
    await supabase.from('book_requests').insert({
      query: query.trim(),
      source,
    });
  } catch {
    // Tracking silencieux
  }
}

/**
 * Récupère les recherches sans résultat (admin).
 */
export async function getZeroResultSearches(limit = 50) {
  if (shouldUseSeedData()) return [];

  // Admin-only read — search_events accepts anonymous inserts (public
  // tracking) but its RLS correctly denies anonymous select, so this must
  // use the service-role client, unlike trackSearchEvent() above.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('search_events')
    .select('normalized_query, query')
    .eq('result_count', 0)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!data) return [];

  // Agrégation par requête normalisée
  const counts = new Map<string, { query: string; count: number }>();
  data.forEach((row) => {
    const key = row.normalized_query;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { query: row.query, count: 1 });
    }
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Récupère les demandes d'ouvrages (admin).
 */
export async function getBookRequests(limit = 50) {
  if (shouldUseSeedData()) return [];

  // Same reasoning as getZeroResultSearches above.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('book_requests')
    .select('query, source, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (!data) return [];

  const counts = new Map<string, { query: string; source: string; count: number }>();
  data.forEach((row) => {
    const key = row.query.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { query: row.query, source: row.source || 'unknown', count: 1 });
    }
  });

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
