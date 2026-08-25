import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CollectionList } from '@/components/admin/collection-list';

async function getAdminCollections() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('collections')
    .select('id, slug, title, eyebrow, status, position, collection_products(count)')
    .order('position');

  if (error || !data) return [];

  return data.map((c: any) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    eyebrow: c.eyebrow || null,
    status: c.status as 'draft' | 'published',
    productCount: c.collection_products?.[0]?.count || 0,
    position: c.position,
  }));
}

export default async function CollectionsAdminPage() {
  const collections = await getAdminCollections();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Collections Éditoriales</h1>
          <p className="admin-page-subtitle">Créez et organisez les sélections thématiques de livres.</p>
        </div>
        <Link href="/admin/collections/nouveau" className="btn btn-primary">
          <Plus size={16} />
          <span>Nouvelle collection</span>
        </Link>
      </div>

      <CollectionList collections={collections} />
    </div>
  );
}
