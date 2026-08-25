import { notFound } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CollectionForm } from '@/components/admin/collection-form';
import type { PickerProduct } from '@/components/admin/collection-product-picker';

async function getCollection(id: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('collections')
    .select(`
      id, slug, title, eyebrow, description, status,
      collection_products (
        position,
        products ( id, slug, title, price, status, authors(name), publishers(name), product_images(storage_path, type) )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const products: PickerProduct[] = ((data as any).collection_products || [])
    .sort((a: any, b: any) => a.position - b.position)
    .map((cp: any) => {
      const p = cp.products;
      if (!p) return null;
      const cover = p.product_images?.find((img: any) => img.type === 'cover') || p.product_images?.[0];
      const coverUrl = cover?.storage_path
        ? (cover.storage_path.startsWith('http') ? cover.storage_path : `${supabaseUrl}/storage/v1/object/public/product-images/${cover.storage_path}`)
        : null;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        status: p.status,
        author: p.authors?.name || null,
        publisher: p.publishers?.name || null,
        coverUrl,
      };
    })
    .filter(Boolean);

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    eyebrow: data.eyebrow || '',
    description: data.description || '',
    status: data.status as 'draft' | 'published',
    products,
  };
}

export default async function EditCollectionPage({ params }: { params: { id: string } }) {
  const collection = await getCollection(params.id);
  if (!collection) notFound();

  return <CollectionForm initialData={collection} collectionId={params.id} />;
}
