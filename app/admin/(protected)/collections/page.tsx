import Link from 'next/link';
import { Plus, Library } from 'lucide-react';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';

async function getAdminCollections() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createServerClient();
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
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre de la collection</th>
              <th>Sur-titre (Eyebrow)</th>
              <th>Slug</th>
              <th>Livres associés</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 0 }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Library size={24} />
                    </div>
                    <h3 className="empty-state-title">Aucune collection pour le moment</h3>
                    <p className="empty-state-text">Les collections permettent d&apos;effectuer des sélections thématiques sur la boutique (ex: &quot;Pack Spécial Ramadan&quot;).</p>
                  </div>
                </td>
              </tr>
            ) : (
              collections.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>{c.eyebrow || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--admin-text-subtle)' }}>/{c.slug}</td>
                  <td><strong>{c.productCount}</strong> livre(s)</td>
                  <td>
                    <span className={`status-badge ${c.status === 'published' ? 'status-published' : 'status-draft'}`}>
                      {c.status === 'published' ? 'Publiée' : 'Brouillon'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
