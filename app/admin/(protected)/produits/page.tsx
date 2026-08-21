import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { products as seedProducts } from '@/lib/al-furqan-data';
import { dbAvailabilityToUi } from '@/lib/types/mappers';
import { ProductListTable } from '@/components/admin/product-list-table';

async function getAdminProducts(status?: string) {
  if (!isSupabaseConfigured()) {
    return seedProducts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      author: p.author,
      price: p.price,
      status: 'published' as const,
      availability: p.availability,
      updatedAt: new Date().toISOString(),
      color: p.color,
      ink: p.ink,
    }));
  }

  const supabase = createServerClient();
  let query = supabase
    .from('products')
    .select('id, slug, title, price, status, availability, updated_at, color, ink, authors(name)')
    .order('updated_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return [];

  return (data || []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    author: p.authors?.name || 'Inconnu',
    price: p.price || 0,
    status: p.status,
    availability: dbAvailabilityToUi(p.availability),
    updatedAt: p.updated_at,
    color: p.color || 'navy',
    ink: p.ink || '#f7e6c4',
  }));
}

export default async function AdminProduitsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const products = await getAdminProducts(searchParams.status);
  const isConfigured = isSupabaseConfigured();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Produits</h1>
          <p className="admin-page-subtitle">Gérez l&apos;inventaire, les prix et la visibilité des livres.</p>
        </div>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          <Plus size={15} /> Ajouter
        </Link>
      </div>

      {!isConfigured && (
        <div className="admin-alert admin-alert-warning">
          Mode développement — données seed. La modification n&apos;est pas persistée sans Supabase.
        </div>
      )}

      <ProductListTable products={products} />
    </div>
  );
}
