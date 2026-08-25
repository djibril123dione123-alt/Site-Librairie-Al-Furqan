import { notFound } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbAvailabilityToUi } from '@/lib/types/mappers';
import { ProductForm } from '@/components/admin/product-form';

async function getAdminCategories() {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, position, is_visible')
    .eq('is_visible', true)
    .order('position');

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    position: c.position,
    isVisible: c.is_visible,
  }));
}

async function getProduct(id: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      authors(id, name, slug),
      publishers(id, name, slug),
      categories(id, name, slug),
      product_images(*),
      product_variants(*),
      product_themes(themes(id, name))
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  // Tri garanti des images par position ASC
  const sortedImages = (data.product_images || []).sort((a: any, b: any) => a.position - b.position);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // Reconstituer la liste de thèmes sous forme de chaîne séparée par des virgules
  const themesList = (data.product_themes || [])
    .map((pt: any) => pt.themes?.name)
    .filter(Boolean)
    .join(', ');

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle || '',
    author: (data as any).authors?.name || '',
    authorId: data.author_id || (data as any).authors?.id || '',
    publisher: (data as any).publishers?.name || '',
    publisherId: data.publisher_id || (data as any).publishers?.id || '',
    category: (data as any).categories?.name || '',
    categoryId: data.category_id || (data as any).categories?.id || '',
    price: data.price?.toString() || '',
    compareAtPrice: data.compare_at_price?.toString() || '',
    availability: dbAvailabilityToUi(data.availability),
    stockQuantity: data.stock_quantity?.toString() || '',
    weightG: (data as any).weight_g?.toString() || '',
    shortDescription: data.short_description || '',
    description: data.description || '',
    language: data.language || 'Français',
    isbn: data.isbn || '',
    pages: data.pages?.toString() || '',
    dimensions: data.dimensions || '',
    binding: data.binding || '',
    edition: data.edition || '',
    year: data.publication_year?.toString() || '',
    themes: themesList,
    reading: data.reading || '',
    tajwid: data.tajwid || false,
    featured: data.featured,
    newArrival: data.new_arrival,
    status: data.status as 'draft' | 'published' | 'archived',
    color: data.color || 'navy',
    hasVariants: data.has_variants,
    images: sortedImages.map((img: any) => {
      const toPublicUrl = (path: string) =>
        path.startsWith('http') ? path : `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
      return {
        id: img.id,
        storagePath: img.storage_path,
        originalStoragePath: img.original_storage_path || undefined,
        cropData: img.crop_data || undefined,
        type: img.type as any,
        position: img.position,
        altText: img.alt_text || '',
        preview: toPublicUrl(img.storage_path),
        originalUrl: toPublicUrl(img.original_storage_path || img.storage_path),
      };
    }),
    variants: (data.product_variants || []).map((v: any) => {
      const attrStr = v.attributes && typeof v.attributes === 'object'
        ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
        : '';
      return {
        clientKey: v.id,
        persistedId: v.id,
        attributes: attrStr,
        price: v.price?.toString() || '',
        stock: v.stock_quantity?.toString() || '',
      };
    })
  };
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    getProduct(params.id),
    getAdminCategories()
  ]);

  if (!product) notFound();

  // The page-level header used to duplicate everything ProductForm's own
  // top bar already shows (title, "Voir sur le site") plus render the raw
  // UUID as a prominent subtitle — on mobile this meant the title appeared
  // twice and got squeezed. ProductForm is now the single source of that
  // identity block; only "Dupliquer" (a capability this page alone knew
  // the route for) is passed through.
  return (
    <ProductForm
      initialData={product}
      productId={params.id}
      categories={categories}
      duplicateHref={`/admin/produits/${params.id}/dupliquer`}
    />
  );
}
