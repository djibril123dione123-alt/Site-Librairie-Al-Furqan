import Link from 'next/link';
import { 
  BookMarked, 
  Tag, 
  Library, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Building2, 
  ArrowRight,
  MessageSquare,
  PackageX
} from 'lucide-react';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';

async function getDashboardStats() {
  if (!isSupabaseConfigured()) {
    return {
      published: 0,
      drafts: 0,
      lowStock: 0,
      categories: 0,
      collections: 0,
      authors: 0,
      publishers: 0,
      recentProducts: [],
      recentRequests: [],
      attentionItems: [],
      analytics: { productViews: 0, cartAdds: 0, whatsappClicks: 0, restockInterests: 0 },
    };
  }

  const supabase = createServerClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: published },
    { count: drafts },
    { count: lowStock },
    { count: categories },
    { count: collections },
    { count: authors },
    { count: publishers },
    { data: recentProducts },
    { data: recentRequests },
    { data: attentionProducts },
    { data: analyticsEvents }
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('products').select('*', { count: 'exact', head: true }).or('stock_quantity.lte.3,availability.eq.temporarily_unavailable'),
    supabase.from('categories').select('*', { count: 'exact', head: true }).eq('is_visible', true),
    supabase.from('collections').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('authors').select('*', { count: 'exact', head: true }),
    supabase.from('publishers').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('id, slug, title, status, availability, stock_quantity, updated_at, authors(name)').order('updated_at', { ascending: false }).limit(5),
    supabase.from('book_requests').select('id, query, created_at, source').order('created_at', { ascending: false }).limit(5),
    supabase.from('products').select('id, slug, title, status, availability, stock_quantity').or('stock_quantity.lte.3,availability.eq.temporarily_unavailable,status.eq.draft').limit(5),
    supabase.from('catalog_events').select('event_type').gte('created_at', sevenDaysAgo)
  ]);

  const eventCounts = {
    productViews: 0,
    cartAdds: 0,
    whatsappClicks: 0,
    restockInterests: 0,
  };

  (analyticsEvents || []).forEach((e: any) => {
    if (e.event_type === 'product_view') eventCounts.productViews++;
    if (e.event_type === 'add_to_cart') eventCounts.cartAdds++;
    if (e.event_type === 'whatsapp_click') eventCounts.whatsappClicks++;
    if (e.event_type === 'restock_interest') eventCounts.restockInterests++;
  });

  return {
    published: published ?? 0,
    drafts: drafts ?? 0,
    lowStock: lowStock ?? 0,
    categories: categories ?? 0,
    collections: collections ?? 0,
    authors: authors ?? 0,
    publishers: publishers ?? 0,
    analytics: eventCounts,
    recentProducts: (recentProducts || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      author: p.authors?.name || 'Inconnu',
      status: p.status,
      updatedAt: p.updated_at
    })),
    recentRequests: (recentRequests || []).map((r: any) => ({
      id: r.id,
      query: r.query,
      createdAt: r.created_at,
      source: r.source || 'catalogue'
    })),
    attentionItems: (attentionProducts || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      reason: p.status === 'draft' ? 'Brouillon non publié' : p.stock_quantity === 0 ? 'Rupture de stock' : 'Stock faible'
    }))
  };
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const isConfigured = isSupabaseConfigured();

  return (
    <div>
      {/* Header de page avec titre et CTA principal */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Vue d&apos;ensemble</h1>
          <p className="admin-page-subtitle">Gestion du catalogue et aperçu de l&apos;activité de la Librairie Al Furqan.</p>
        </div>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          <Plus size={16} />
          <span>Ajouter un livre</span>
        </Link>
      </div>

      {!isConfigured && (
        <div className="admin-alert admin-alert-warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Mode développement</strong> — Base Supabase non configurée.
            Consultez <code>docs/SUPABASE_SETUP.md</code> pour lier votre projet de production.
          </div>
        </div>
      )}

      {/* Cartes de statistiques clés */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Livres publiés</div>
          <div className="admin-stat-value">{stats.published}</div>
          <div className="admin-stat-footer">
            <span>Visibles sur le site</span>
            <Link href="/admin/produits?status=published">Gérer <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Brouillons</div>
          <div className="admin-stat-value">{stats.drafts}</div>
          <div className="admin-stat-footer">
            <span>En cours de rédaction</span>
            <Link href="/admin/produits?status=draft">Gérer <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Stock faible / Ruptures</div>
          <div className="admin-stat-value" style={{ color: stats.lowStock > 0 ? '#B91C1C' : 'var(--admin-petrol)' }}>
            {stats.lowStock}
          </div>
          <div className="admin-stat-footer">
            <span>Nécessitent attention</span>
            <Link href="/admin/produits?availability=out_of_stock">Vérifier <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">Catégories & Collections</div>
          <div className="admin-stat-value">{stats.categories + stats.collections}</div>
          <div className="admin-stat-footer">
            <span>{stats.categories} cat. / {stats.collections} coll.</span>
            <Link href="/admin/categories">Explorer <ArrowRight size={12} style={{ display: 'inline' }} /></Link>
          </div>
        </div>
      </div>

      {/* Analytics 7 derniers jours */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div className="admin-card-header" style={{ marginBottom: 12 }}>
          <h2 className="admin-card-title">Activité 7 derniers jours (Catalogue)</h2>
          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Métriques anonymes</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--admin-bg)', padding: '12px 16px', borderRadius: 'var(--admin-radius-sm)', border: '1px solid var(--admin-border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--admin-text-muted)' }}>Vues produits</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--admin-petrol)', marginTop: 4 }}>{stats.analytics?.productViews ?? 0}</div>
          </div>
          <div style={{ background: 'var(--admin-bg)', padding: '12px 16px', borderRadius: 'var(--admin-radius-sm)', border: '1px solid var(--admin-border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--admin-text-muted)' }}>Ajouts au panier</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--admin-petrol)', marginTop: 4 }}>{stats.analytics?.cartAdds ?? 0}</div>
          </div>
          <div style={{ background: 'var(--admin-bg)', padding: '12px 16px', borderRadius: 'var(--admin-radius-sm)', border: '1px solid var(--admin-border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--admin-text-muted)' }}>Clics WhatsApp</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669', marginTop: 4 }}>{stats.analytics?.whatsappClicks ?? 0}</div>
          </div>
          <div style={{ background: 'var(--admin-bg)', padding: '12px 16px', borderRadius: 'var(--admin-radius-sm)', border: '1px solid var(--admin-border)' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--admin-text-muted)' }}>Intérêts réappro.</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706', marginTop: 4 }}>{stats.analytics?.restockInterests ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Grille principale 2 colonnes : Dernières modifications & Attention requise */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Derniers livres modifiés */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <Clock size={16} />
              Derniers livres modifiés
            </h2>
            <Link href="/admin/produits" className="btn btn-secondary btn-sm">
              Tout voir
            </Link>
          </div>

          {stats.recentProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-state-icon">
                <BookMarked size={20} />
              </div>
              <h3 className="empty-state-title">Aucun livre pour le moment</h3>
              <p className="empty-state-text">Commencez par ajouter le premier ouvrage de la librairie.</p>
              <Link href="/admin/produits/nouveau" className="btn btn-primary btn-sm">
                <Plus size={14} /> Ajouter un livre
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recentProducts.map((p) => (
                <div 
                  key={p.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--admin-radius-sm)',
                    backgroundColor: 'var(--admin-bg)',
                    border: '1px solid var(--admin-border)'
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 12 }}>
                    <Link 
                      href={`/admin/produits/${p.id}`}
                      style={{ fontWeight: 600, fontSize: 13, color: 'var(--admin-text)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                      Par {p.author} • {formatDate(p.updatedAt)}
                    </div>
                  </div>

                  <span className={`status-badge ${p.status === 'published' ? 'status-published' : 'status-draft'}`}>
                    {p.status === 'published' ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produits nécessitant une attention */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <AlertTriangle size={16} style={{ color: '#D97706' }} />
              Attention requise
            </h2>
            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
              {stats.attentionItems.length} élément(s)
            </span>
          </div>

          {stats.attentionItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 16px' }}>
              <div className="empty-state-icon" style={{ backgroundColor: 'var(--admin-success-bg)', color: 'var(--admin-success-text)' }}>
                <CheckCircle2 size={20} />
              </div>
              <h3 className="empty-state-title">Tout est en ordre</h3>
              <p className="empty-state-text">Tous les livres sont publiés et le stock est suffisant.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.attentionItems.map((item) => (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--admin-radius-sm)',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A'
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 12 }}>
                    <Link 
                      href={`/admin/produits/${item.id}`}
                      style={{ fontWeight: 600, fontSize: 13, color: '#92400E', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {item.title}
                    </Link>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#B45309' }}>
                      {item.reason}
                    </div>
                  </div>

                  <Link href={`/admin/produits/${item.id}`} className="btn btn-secondary btn-sm">
                    Corriger
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raccourcis d'organisation du catalogue */}
      <div className="admin-card">
        <h2 className="admin-card-title" style={{ marginBottom: 16 }}>
          Raccourcis de gestion du catalogue
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Link href="/admin/produits/nouveau" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Plus size={16} />
            <span>Nouveau livre</span>
          </Link>
          <Link href="/admin/categories" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Tag size={16} />
            <span>Gérer catégories ({stats.categories})</span>
          </Link>
          <Link href="/admin/collections" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Library size={16} />
            <span>Gérer collections ({stats.collections})</span>
          </Link>
          <Link href="/admin/auteurs" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Users size={16} />
            <span>Gérer auteurs ({stats.authors})</span>
          </Link>
          <Link href="/admin/editeurs" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Building2 size={16} />
            <span>Gérer éditeurs ({stats.publishers})</span>
          </Link>
          <Link href="/admin/demandes" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <MessageSquare size={16} />
            <span>Demandes d&apos;ouvrages</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
