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
  language?: string;
  availability?: string;
  reading?: string;
  featured?: boolean;
  newArrival?: boolean;
  restocked?: boolean;
  search?: string;
  collection?: string;
  status?: 'published' | 'draft' | 'archived';
  limit?: number;
}

/**
 * Récupère la liste de produits avec filtres optionnels.
 * Le public ne voit que les produits published.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
  if (shouldUseSeedData()) {
    // Fallback seed
    let list = seedProducts.map(adaptSeedProduct);
    if (filters.search) list = searchSeedProducts(filters.search).map(adaptSeedProduct);
    if (filters.category) list = list.filter((p) => p.category === filters.category);
    if (filters.language) list = list.filter((p) => p.language === filters.language);
    if (filters.reading) list = list.filter((p) => p.reading === filters.reading);
    if (filters.availability) list = list.filter((p) => p.availability === filters.availability);
    if (filters.featured) list = list.filter((p) => p.featured);
    if (filters.newArrival) list = list.filter((p) => p.newArrival);
    if (filters.restocked) list = list.filter((p) => p.restocked);
    if (filters.collection) {
      const col = seedCollections.find(c => c.slug === filters.collection);
      if (col) list = list.filter(p => col.productIds.includes(p.id));
    }
    if (filters.limit) list = list.slice(0, filters.limit);
    return list;
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
    `)
    .order('created_at', { ascending: false });

  // Le public ne voit que les produits publiés
  const status = filters.status || 'published';
  query = query.eq('status', status);

  if (filters.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},isbn.ilike.${term}`);
  }

  if (filters.category) {
    // Jointure par slug de catégorie
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', filters.category)
      .single();
    if (cat) query = query.eq('category_id', cat.id);
  }

  if (filters.language) {
    query = query.eq('language', filters.language);
  }

  if (filters.reading) {
    query = query.eq('reading', filters.reading);
  }

  if (filters.featured) {
    query = query.eq('featured', true);
  }

  if (filters.newArrival) {
    query = query.eq('new_arrival', true);
  }
  
  if (filters.restocked) {
    // Utiliser la colonne Supabase (si elle n'existe pas, on simule via availability pour l'instant)
    query = query.or('availability.eq.De retour en stock');
  }
  
  if (filters.collection) {
    // Support collections via jointure si possible.
    const { data: col } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', filters.collection)
      .single();
    
    if (col) {
      const { data: colProducts } = await supabase
        .from('collection_products')
        .select('product_id')
        .eq('collection_id', col.id);
      
      if (colProducts && colProducts.length > 0) {
        query = query.in('id', colProducts.map(cp => cp.product_id));
      } else {
        return []; // Collection vide
      }
    } else {
      return []; // Collection inexistante
    }
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getProducts] Erreur Supabase:', error.message);
    return [];
  }

  return (data || []).map((p: any) => dbProductToUi(p, supabaseUrl));
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
