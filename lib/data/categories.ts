/**
 * Repository catégories.
 */

import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import { dbCategoryToUi } from '@/lib/types/mappers';
import type { Category } from '@/lib/types/ui';
import { seedCategories } from '@/lib/dev/seed-products';

export async function getCategories(): Promise<Category[]> {
  if (shouldUseSeedData()) {
    return seedCategories.map((name: string, index: number) => ({
      id: `seed-${index}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      position: index,
      isVisible: true,
    }));
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_visible', true)
    .order('position', { ascending: true });

  if (error) {
    console.error('[getCategories]', error.message);
    return [];
  }

  return (data || []).map(dbCategoryToUi);
}

export async function getCategoryNames(): Promise<string[]> {
  const cats = await getCategories();
  return cats.map((c) => c.name);
}
