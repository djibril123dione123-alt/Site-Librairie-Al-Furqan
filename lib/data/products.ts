/**
 * Repository produits — source de vérité centralisée.
 *
 * Stratégie :
 * - Si Supabase est configuré → requêtes DB
 * - Sinon → fallback seed (développement uniquement)
 *
 * Les composants n'importent JAMAIS Supabase directement.
 */

import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { normalizeSearchString, expandSearchAliases } from '@/lib/utils/search-utils';

// Fallback seed (TEMPORAIRE — développement uniquement)
import { seedProducts, searchSeedProducts, getRelatedSeedProducts, seedCollections } from '@/lib/dev/seed-products';

// Re-export des types seed vers types UI (bridge temporaire)
function adaptSeedProduct(p: (typeof seedProducts)[number]): Product {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    author: p.author,
    publisher: p.publisher,
    category: p.category,
    themes: p.themes,
    language: p.language,
    price: p.price,
    availability: p.availability,
    featured: p.featured,
    newArrival: p.newArrival,
    restocked: p.restocked,
    reading: p.reading,
    tajwid: p.tajwid,
    aliases: p.aliases,
    description: p.description,
    isbn: p.isbn,
    pages: p.pages,
    dimensions: p.dimensions,
    binding: p.binding,
    edition: p.edition,
    year: p.year,
    audience: p.audience,
    variants: p.variants?.map((v) => ({
      id: v.id,
      attributes: v.attributes,
      price: v.price,
      stock: v.stock,
    })),
    color: p.color,
    ink: p.ink,
  };
}

export interface ProductFilters {
  category?: string;
  author?: string;
  publisher?: string;
  language?: string;
  availability?: string;
  reading?: string;
  tajwid?: boolean;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  newArrival?: boolean;
  restocked?: boolean;
  search?: string;
  collection?: string;
  status?: 'published' | 'draft' | 'archived';
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult {
  products: Product[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export async function getProductsPaginated(filters: ProductFilters = {}): Promise<PaginatedResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 12;

  if (shouldUseSeedData()) {
    let list = seedProducts.map(adaptSeedProduct);
    if (filters.search) list = searchSeedProducts(filters.search).map(adaptSeedProduct);
    if (filters.category) list = list.filter((p) => p.category === filters.category || p.category.toLowerCase() === filters.category?.toLowerCase());
    if (filters.author) list = list.filter((p) => p.author.toLowerCase().includes(filters.author!.toLowerCase()));
    if (filters.publisher) list = list.filter((p) => p.publisher.toLowerCase().includes(filters.publisher!.toLowerCase()));
    if (filters.language) list = list.filter((p) => p.language === filters.language);
    if (filters.reading) list = list.filter((p) => p.reading === filters.reading);
    if (filters.tajwid !== undefined) list = list.filter((p) => Boolean(p.tajwid) === filters.tajwid);
    if (filters.availability) list = list.filter((p) => p.availability === filters.availability);
    if (filters.minPrice !== undefined) list = list.filter((p) => p.price >= filters.minPrice!);
    if (filters.maxPrice !== undefined) list = list.filter((p) => p.price <= filters.maxPrice!);
    if (filters.featured) list = list.filter((p) => p.featured);
    if (filters.newArrival) list = list.filter((p) => p.newArrival);
    if (filters.restocked) list = list.filter((p) => p.restocked);
    
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);

    return { products: paginated, totalCount, page, totalPages };
  }

  const supabase = createServerClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  let query = supabase
    .from('products')
    .select(`
      *,
      authors (id, name, slug),
      publishers (id, name, slug),
      categories (id, name, slug),
      product_themes (themes (name)),
      product_images (id, storage_path, alt_text, position, type)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  const status = filters.status || 'published';
  query = query.eq('status', status);

  if (filters.search) {
    const norm = normalizeSearchString(filters.search);
    try {
      const { data: rpcIds, error: rpcErr } = await supabase.rpc('search_published_products', {
        query_text: filters.search,
      });

      if (!rpcErr && rpcIds && rpcIds.length > 0) {
        query = query.in('id', rpcIds);
      } else {
        const searchTerm = `%${norm}%`;
        query = query.or(
          `title.ilike.${searchTerm},subtitle.ilike.${searchTerm},description.ilike.${searchTerm},isbn.ilike.${searchTerm},language.ilike.${searchTerm},reading.ilike.${searchTerm}`
        );
      }
    } catch {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm},isbn.ilike.${searchTerm}`);
    }
  }

  if (filters.category) {
    const { data: cat } = await supabase.from('categories').select('id').or(`slug.eq.${filters.category},name.eq.${filters.category}`).single();
    if (cat) query = query.eq('category_id', cat.id);
  }

  if (filters.author) {
    const { data: aut } = await supabase.from('authors').select('id').or(`slug.eq.${filters.author},name.ilike.%${filters.author}%`).single();
    if (aut) query = query.eq('author_id', aut.id);
  }

  if (filters.publisher) {
    const { data: pub } = await supabase.from('publishers').select('id').or(`slug.eq.${filters.publisher},name.ilike.%${filters.publisher}%`).single();
    if (pub) query = query.eq('publisher_id', pub.id);
  }

  if (filters.language) query = query.eq('language', filters.language);
  if (filters.reading) query = query.eq('reading', filters.reading);
  if (filters.tajwid !== undefined) query = query.eq('tajwid', filters.tajwid);
  if (filters.minPrice !== undefined) query = query.gte('price', filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, count, error } = await query;

  if (error) {
    console.error('[getProductsPaginated] Erreur Supabase:', error.message);
    return { products: [], totalCount: 0, page: 1, totalPages: 1 };
  }

  const products = (data || []).map((p: any) => dbProductToUi(p, supabaseUrl));
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return { products, totalCount, page, totalPages };
}

export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const result = await getProductsPaginated({ ...filters, pageSize: filters.limit || 100 });
  return result.products;
}

/**
 * Récupère un produit par son slug avec toutes ses relations.
 * Retourne null si inexistant ou non publié.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (shouldUseSeedData()) {
    const p = seedProducts.find(prod => prod.slug === slug);
    return p ? adaptSeedProduct(p) : null;
  }

  const supabase = createServerClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      authors (id, name, slug, bio),
      publishers (id, name, slug, description),
      categories (id, name, slug),
      product_themes (themes (id, name, slug)),
      product_variants (id, sku, price, stock_quantity, availability, attributes, image_id),
      product_images (id, storage_path, alt_text, position, type)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return null;
  }

  return dbProductToUi(data as any, supabaseUrl);
}

/**
 * Recherche full-text sur les produits publiés.
 * Utilise PostgreSQL FTS si Supabase, sinon fallback seed.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  return getProducts({ search: query });
}

/**
 * Produits liés (même catégorie ou thèmes communs).
 */
export async function getRelatedProducts(product: Product, limit = 3): Promise<Product[]> {
  if (shouldUseSeedData()) {
    return getRelatedSeedProducts(
      seedProducts.find((p) => p.id === product.id)!,
      limit
    ).map(adaptSeedProduct);
  }

  const supabase = createServerClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      authors (id, name, slug),
      publishers (id, name, slug),
      categories (id, name, slug),
      product_themes (themes (name)),
      product_images (id, storage_path, alt_text, position, type)
    `)
    .eq('status', 'published')
    .eq('category_id', product.categoryId || '')
    .neq('id', product.id)
    .limit(limit);

  if (error || !data) return [];

  return data.map((p: any) => dbProductToUi(p, supabaseUrl));
}

/**
 * Suggestions autocomplete (produits + auteurs + thèmes).
 */
export async function getAutocompleteSuggestions(query: string) {
  if (!query.trim()) return { products: [], authors: [], themes: [] };

  if (shouldUseSeedData()) {
    const { normalizeSeedQuery, searchSeedProducts } = await import('@/lib/dev/seed-products');
    const normalized = normalizeSeedQuery(query);
    const matched = searchSeedProducts(query).slice(0, 5);
    const authorSet = new Set<string>();
    const themeSet = new Set<string>();
    matched.forEach((product) => {
      if (normalizeSeedQuery(product.author).includes(normalized)) authorSet.add(product.author);
      product.themes.forEach((theme) => { if (normalizeSeedQuery(theme).includes(normalized)) themeSet.add(theme); });
    });
    return {
      products: matched.map(adaptSeedProduct),
      authors: Array.from(authorSet).slice(0, 3),
      themes: Array.from(themeSet).slice(0, 3),
    };
  }

  const products = await searchProducts(query);
  const authorSet = new Set<string>();
  const themeSet = new Set<string>();
  
  const normalized = query.toLowerCase().trim();
  products.slice(0, 5).forEach((p) => {
    if (p.author.toLowerCase().includes(normalized)) authorSet.add(p.author);
    p.themes.forEach((t) => {
      if (t.toLowerCase().includes(normalized)) themeSet.add(t);
    });
  });

  return {
    products: products.slice(0, 5),
    authors: Array.from(authorSet).slice(0, 3),
    themes: Array.from(themeSet).slice(0, 3),
  };
}
