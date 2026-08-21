import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import type { Author, Publisher, Category } from '@/lib/types/ui';
import { seedCategories } from '@/lib/dev/seed-products';

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  if (shouldUseSeedData()) {
    const formatted = slug.replace(/-/g, ' ');
    const name = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return {
      id: slug,
      name,
      slug,
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('authors')
    .select('id, name, slug, bio')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    bio: data.bio ?? undefined,
  };
}

export async function getPublisherBySlug(slug: string): Promise<Publisher | null> {
  if (shouldUseSeedData()) {
    const formatted = slug.replace(/-/g, ' ');
    const name = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return {
      id: slug,
      name,
      slug,
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('publishers')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? undefined,
  };
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (shouldUseSeedData()) {
    const match = seedCategories.find(
      (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') === slug
    );
    if (!match) return null;
    return {
      id: slug,
      name: match,
      slug,
      position: 0,
      isVisible: true,
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, position, is_visible')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? undefined,
    position: data.position,
    isVisible: data.is_visible,
  };
}
