/**
 * Mappers : transformation données DB Supabase → types UI.
 * Isole les composants React des structures SQL brutes.
 */

import type { Database } from './database';
import type { Product, Collection, Category, Author, Publisher, Availability, Variant, VariantAttribute, ProductImage } from './ui';

type DbProduct = Database['public']['Tables']['products']['Row'];
type DbAuthor = Database['public']['Tables']['authors']['Row'];
type DbPublisher = Database['public']['Tables']['publishers']['Row'];
type DbCategory = Database['public']['Tables']['categories']['Row'];
type DbCollection = Database['public']['Tables']['collections']['Row'];
type DbVariant = Database['public']['Tables']['product_variants']['Row'];
type DbImage = Database['public']['Tables']['product_images']['Row'];

// Mapping disponibilité DB → UI
const AVAILABILITY_MAP: Record<string, Availability> = {
  in_stock: 'Disponible',
  out_of_stock: 'Indisponible temporairement',
  temporarily_unavailable: 'Indisponible temporairement',
  restocked: 'De retour en stock',
  low_stock: 'Derniers exemplaires',
};

export function dbAvailabilityToUi(dbValue: string | null): Availability {
  if (!dbValue) return 'Disponible';
  return AVAILABILITY_MAP[dbValue] || 'Disponible';
}

export function uiAvailabilityToDb(uiValue: Availability): string {
  const map: Record<Availability, string> = {
    'Disponible': 'in_stock',
    'Derniers exemplaires': 'low_stock',
    'De retour en stock': 'restocked',
    'Indisponible temporairement': 'temporarily_unavailable',
  };
  return map[uiValue] || 'in_stock';
}

export function dbVariantToUi(dbVariant: DbVariant): Variant {
  const attrs = dbVariant.attributes as Record<string, string> | null;
  const attributes: VariantAttribute[] = attrs
    ? Object.entries(attrs).map(([label, value]) => ({ label, value }))
    : [];

  return {
    id: dbVariant.id,
    sku: dbVariant.sku ?? undefined,
    attributes,
    price: dbVariant.price ?? 0,
    stock: dbVariant.stock_quantity ?? 0,
  };
}

export function dbImageToUi(dbImage: DbImage, supabaseUrl: string): ProductImage {
  const url = dbImage.storage_path.startsWith('http')
    ? dbImage.storage_path
    : `${supabaseUrl}/storage/v1/object/public/product-images/${dbImage.storage_path}`;
  return {
    id: dbImage.id,
    url,
    alt: dbImage.alt_text ?? '',
    type: dbImage.type as ProductImage['type'],
    position: dbImage.position,
  };
}

export function dbProductToUi(
  dbProduct: DbProduct & {
    authors?: DbAuthor | null;
    publishers?: DbPublisher | null;
    categories?: DbCategory | null;
    themes?: { themes: { name: string } }[];
    product_variants?: DbVariant[];
    product_images?: DbImage[];
  },
  supabaseUrl?: string
): Product {
  const availability = dbAvailabilityToUi(dbProduct.availability);

  const themes = dbProduct.themes?.map((t) => t.themes.name) ?? [];
  const variants = dbProduct.product_variants?.map(dbVariantToUi) ?? [];

  const rawImages = dbProduct.product_images
    ? [...dbProduct.product_images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [];

  const images = supabaseUrl
    ? rawImages.map((img) => dbImageToUi(img, supabaseUrl))
    : [];

  const coverImg = images.find((i) => i.type === 'cover') || images[0];
  const coverUrl = coverImg?.url ?? null;

  return {
    id: dbProduct.id,
    slug: dbProduct.slug,
    title: dbProduct.title,
    subtitle: dbProduct.subtitle ?? undefined,
    author: dbProduct.authors?.name ?? 'Auteur inconnu',
    authorId: dbProduct.author_id ?? undefined,
    publisher: dbProduct.publishers?.name ?? '',
    publisherId: dbProduct.publisher_id ?? undefined,
    category: dbProduct.categories?.name ?? '',
    categoryId: dbProduct.category_id ?? undefined,
    themes,
    language: dbProduct.language ?? '',
    price: dbProduct.price ?? 0,
    availability,
    stockQuantity: dbProduct.stock_quantity ?? undefined,
    featured: dbProduct.featured,
    newArrival: dbProduct.new_arrival,
    restocked: dbProduct.restocked,
    reading: dbProduct.reading as 'Hafs' | 'Warsh' | undefined,
    tajwid: dbProduct.tajwid ?? undefined,
    aliases: [], // Chargé séparément depuis search_aliases
    description: dbProduct.description ?? '',
    shortDescription: dbProduct.short_description ?? undefined,
    isbn: dbProduct.isbn ?? undefined,
    pages: dbProduct.pages ?? undefined,
    dimensions: dbProduct.dimensions ?? undefined,
    binding: dbProduct.binding ?? undefined,
    edition: dbProduct.edition ?? undefined,
    year: dbProduct.publication_year ?? undefined,
    variants: variants.length > 0 ? variants : undefined,
    images: images.length > 0 ? images : undefined,
    coverUrl,
    videoUrl: dbProduct.video_url ?? undefined,
    color: dbProduct.color ?? 'navy',
    ink: dbProduct.ink ?? '#f7e6c4',
  };
}

export function dbCollectionToUi(
  dbCollection: DbCollection & {
    collection_products?: { product_id: string; position: number }[];
  }
): Collection {
  const productIds = dbCollection.collection_products
    ?.sort((a, b) => a.position - b.position)
    .map((cp) => cp.product_id) ?? [];

  return {
    id: dbCollection.id,
    slug: dbCollection.slug,
    title: dbCollection.title,
    eyebrow: dbCollection.eyebrow ?? 'Sélection',
    description: dbCollection.description ?? '',
    productIds,
  };
}

export function dbCategoryToUi(dbCategory: DbCategory): Category {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    slug: dbCategory.slug,
    description: dbCategory.description ?? undefined,
    position: dbCategory.position,
    isVisible: dbCategory.is_visible,
  };
}

export function dbAuthorToUi(dbAuthor: DbAuthor): Author {
  return {
    id: dbAuthor.id,
    name: dbAuthor.name,
    slug: dbAuthor.slug,
    bio: dbAuthor.bio ?? undefined,
  };
}

export function dbPublisherToUi(dbPublisher: DbPublisher): Publisher {
  return {
    id: dbPublisher.id,
    name: dbPublisher.name,
    slug: dbPublisher.slug,
    description: dbPublisher.description ?? undefined,
  };
}
