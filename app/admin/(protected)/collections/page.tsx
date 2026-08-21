import Link from 'next/link';
import { Plus } from 'lucide-react';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { collections as seedCollections } from '@/lib/al-furqan-data';

async function getAdminCollections() {
  if (!isSupabaseConfigured()) {
    return seedCollections.map((c, i) => ({
      id: `seed-${i}`,
      slug: c.slug,
      title: c.title,
      status: 'published' as const,
      productCount: c.productIds.length,
      position: i,
    }));
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from('collections')
    .select('id, slug, title, status, position, collection_products(count)')
    .order('position');

  return (data || []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    status: c.status as 'draft' | 'published',
    productCount: c.collection_products?.[0]?.count || 0,
    position: c.position,
  }));
}

export default async function CollectionsAdminPage() {
  const collections = await getAdminCollections();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Collections</h1>
          <p className="admin-page-subtitle">Sélections éditoriales thématiques.</p>
        </div>
        <Link href="/admin/collections/nouvelle" className="btn btn-primary">
          <Plus size={15} /> Nouvelle collection
        </Link>
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Slug</th>
                <th>Livres</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#718096' }}>
                    Aucune collection. <Link href="/admin/collections/nouvelle">Créer la première →</Link>
                  </td>
                </tr>
              )}
              {collections.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td style={{ fontSize: 12, color: '#718096' }}>{c.slug}</td>
                  <td>{c.productCount}</td>
                  <td>
                    <span className={`status-badge ${c.status === 'published' ? 'status-published' : 'status-draft'}`}>
                      {c.status === 'published' ? 'Publiée' : 'Brouillon'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions" style={{ opacity: 1 }}>
                      <Link href={`/admin/collections/${c.id}`} className="btn btn-secondary btn-sm">
                        Modifier
                      </Link>
                      <Link href={`/collections/${c.slug}`} target="_blank" className="btn btn-secondary btn-sm">
                        Voir
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
