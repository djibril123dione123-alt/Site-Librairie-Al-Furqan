import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { PublishersManager } from '@/components/admin/publishers-manager';

async function getPublishersData() {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('publishers')
    .select('id, name, slug, description, created_at, products(count)')
    .order('name');

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    bookCount: p.products?.[0]?.count ?? 0,
    createdAt: p.created_at
  }));
}

export default async function AdminEditeursPage() {
  const publishers = await getPublishersData();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Éditeurs & Maisons d&apos;Édition</h1>
          <p className="admin-page-subtitle">Gérez le répertoire des éditeurs d&apos;ouvrages de la librairie.</p>
        </div>
      </div>

      <PublishersManager initialPublishers={publishers} />
    </div>
  );
}
