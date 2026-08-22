import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import type { Author, Publisher, Category } from '@/lib/types/ui';
import { seedCategories, seedProducts } from '@/lib/dev/seed-products';

export type AuthorWithCount = Author & { bookCount: number };
export type PublisherWithCount = Publisher & { bookCount: number };

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Real authors referenced by at least one published product — never the
 * "Auteur inconnu" placeholder, since that's just a null author_id on the
 * product, not a real authors-table row. Ordered by book count (most
 * discoverable first), then alphabetically for ties.
 */
export async function getAuthors(): Promise<AuthorWithCount[]> {
  if (shouldUseSeedData()) {
    const counts = new Map<string, number>();
    seedProducts.forEach((p) => { if (p.author) counts.set(p.author, (counts.get(p.author) || 0) + 1); });
    return Array.from(counts.entries())
      .map(([name, bookCount]) => ({ id: slugify(name), name, slug: slugify(name), bookCount }))
      .sort((a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name));
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('author_id, authors!inner(id, name, slug, bio)')
    .eq('status', 'published')
    .not('author_id', 'is', null);

  if (error || !data) return [];

  const counts = new Map<string, { author: Author; count: number }>();
  data.forEach((row: any) => {
    const a = row.authors;
    if (!a) return;
    const existing = counts.get(a.id);
    if (existing) existing.count += 1;
    else counts.set(a.id, { author: { id: a.id, name: a.name, slug: a.slug, bio: a.bio ?? undefined }, count: 1 });
  });

  return Array.from(counts.values())
    .map(({ author, count }) => ({ ...author, bookCount: count }))
    .sort((a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name));
}

/**
 * Real publishers referenced by at least one published product. Same
 * ordering rationale as getAuthors().
 */
export async function getPublishers(): Promise<PublisherWithCount[]> {
  if (shouldUseSeedData()) {
    const counts = new Map<string, number>();
    seedProducts.forEach((p) => { if (p.publisher) counts.set(p.publisher, (counts.get(p.publisher) || 0) + 1); });
    return Array.from(counts.entries())
      .map(([name, bookCount]) => ({ id: slugify(name), name, slug: slugify(name), bookCount }))
      .sort((a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name));
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('publisher_id, publishers!inner(id, name, slug, description)')
    .eq('status', 'published')
    .not('publisher_id', 'is', null);

  if (error || !data) return [];

  const counts = new Map<string, { publisher: Publisher; count: number }>();
  data.forEach((row: any) => {
    const p = row.publishers;
    if (!p) return;
    const existing = counts.get(p.id);
    if (existing) existing.count += 1;
    else counts.set(p.id, { publisher: { id: p.id, name: p.name, slug: p.slug, description: p.description ?? undefined }, count: 1 });
  });

  return Array.from(counts.values())
    .map(({ publisher, count }) => ({ ...publisher, bookCount: count }))
    .sort((a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name));
}

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
