/**
 * Repository collections.
 */

import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import { dbCollectionToUi } from '@/lib/types/mappers';
import type { Collection } from '@/lib/types/ui';
import { seedCollections } from '@/lib/dev/seed-products';

export async function getCollections(): Promise<Collection[]> {
  if (shouldUseSeedData()) {
    return seedCollections.map((c: any) => ({
      slug: c.slug,
      title: c.title,
      eyebrow: c.eyebrow,
      description: c.description,
      productIds: c.productIds,
    }));
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('collections')
    .select(`
      *,
      collection_products (product_id, position)
    `)
    .eq('status', 'published')
    .order('position', { ascending: true });

  if (error) {
    console.error('[getCollections]', error.message);
    return [];
  }

  return (data || []).map((c: any) => dbCollectionToUi(c));
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  if (shouldUseSeedData()) {
    const c = seedCollections.find((c: any) => c.slug === slug);
    if (!c) return null;
    return {
      slug: c.slug,
      title: c.title,
      eyebrow: c.eyebrow,
      description: c.description,
      productIds: c.productIds,
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('collections')
    .select(`
      *,
      collection_products (product_id, position)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;

  return dbCollectionToUi(data as any);
}
