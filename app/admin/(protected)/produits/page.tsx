import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { dbAvailabilityToUi } from '@/lib/types/mappers';
import { ProductListTable } from '@/components/admin/product-list-table';

async function getAdminProductsData() {
  if (!isSupabaseConfigured()) {
    return { products: [], categories: [] };
  }

  const supabase = createServerClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('id, slug, title, subtitle, isbn, price, status, availability, stock_quantity, updated_at, color, ink, authors(name), categories(name), product_images(storage_path, type)')
      .order('updated_at', { ascending: false }),
    supabase.from('categories').select('id, name').order('name')
  ]);

  const mappedProducts = (products || []).map((p: any) => {
    const primaryImg = p.product_images?.find((img: any) => img.type === 'cover') || p.product_images?.[0];
    const coverUrl = primaryImg?.storage_path
      ? (primaryImg.storage_path.startsWith('http')
          ? primaryImg.storage_path
          : `${supabaseUrl}/storage/v1/object/public/product-images/${primaryImg.storage_path}`)
      : null;

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle || null,
      isbn: p.isbn || null,
      author: p.authors?.name || 'Inconnu',
      category: p.categories?.name || 'Non classé',
      price: p.price || 0,
      status: p.status,
      availability: dbAvailabilityToUi(p.availability),
      stockQuantity: p.stock_quantity ?? 0,
      updatedAt: p.updated_at,
      color: p.color || 'navy',
      ink: p.ink || '#f7e6c4',
      coverUrl,
    };
  });

  return {
    products: mappedProducts,
    categories: (categories || []).map((c: any) => c.name)
  };
}

export default async function AdminProduitsPage() {
  const { products, categories } = await getAdminProductsData();
  const isConfigured = isSupabaseConfigured();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Livres & Catalogue</h1>
          <p className="admin-page-subtitle">Gérez l&apos;inventaire, les prix, les catégories et la publication des livres.</p>
        </div>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          <Plus size={16} />
          <span>Ajouter un livre</span>
        </Link>
      </div>

      {!isConfigured && (
        <div className="admin-alert admin-alert-warning">
          Mode développement — Supabase non configuré.
        </div>
      )}

      <ProductListTable products={products} categories={categories} />
    </div>
  );
}
