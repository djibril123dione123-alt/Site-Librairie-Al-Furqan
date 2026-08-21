import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Copy, Eye, Archive } from 'lucide-react';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { seedProducts } from '@/lib/dev/seed-products';
import { ProductForm } from '@/components/admin/product-form';

async function getProduct(id: string) {
  if (!isSupabaseConfigured()) {
    // En dev, essayer de trouver par id dans le seed
    const seed = seedProducts.find(p => p.id === id || p.slug === id);
    if (!seed) return null;
    return {
      id: seed.id,
      title: seed.title,
      subtitle: '',
      author: seed.author,
      publisher: seed.publisher,
      category: seed.category,
      price: seed.price.toString(),
      availability: seed.availability,
      stockQuantity: '',
      shortDescription: '',
      description: seed.description,
      language: seed.language,
      isbn: seed.isbn || '',
      pages: seed.pages?.toString() || '',
      dimensions: seed.dimensions || '',
      binding: seed.binding || '',
      edition: seed.edition || '',
      year: seed.year?.toString() || '',
      themes: seed.themes.join(', '),
      reading: seed.reading || '',
      tajwid: seed.tajwid || false,
      featured: seed.featured || false,
      newArrival: seed.newArrival || false,
      status: 'published' as const,
      color: seed.color,
      hasVariants: !!(seed.variants && seed.variants.length > 0),
    };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, authors(name), publishers(name), categories(name)')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    subtitle: data.subtitle || '',
    author: (data as any).authors?.name || '',
    publisher: (data as any).publishers?.name || '',
    category: (data as any).categories?.name || '',
    price: data.price?.toString() || '',
    availability: data.availability,
    stockQuantity: data.stock_quantity?.toString() || '',
    shortDescription: data.short_description || '',
    description: data.description || '',
    language: data.language || 'Français',
    isbn: data.isbn || '',
    pages: data.pages?.toString() || '',
    dimensions: data.dimensions || '',
    binding: data.binding || '',
    edition: data.edition || '',
    year: data.publication_year?.toString() || '',
    themes: '',
    reading: data.reading || '',
    tajwid: data.tajwid || false,
    featured: data.featured,
    newArrival: data.new_arrival,
    status: data.status as 'draft' | 'published',
    color: data.color || 'navy',
    hasVariants: data.has_variants,
  };
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);
  if (!product) notFound();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{product.title}</h1>
          <p className="admin-page-subtitle">Modifier la fiche produit</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/livres/${params.id}`} target="_blank" className="btn btn-secondary">
            <Eye size={14} /> Voir sur le site
          </Link>
          <Link href={`/admin/produits/${params.id}/dupliquer`} className="btn btn-secondary">
            <Copy size={14} /> Dupliquer
          </Link>
        </div>
      </div>
      <ProductForm initialData={product} productId={params.id} />
    </div>
  );
}
