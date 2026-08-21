import Link from 'next/link';
import { BookMarked, Tag, Library, Plus, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createServerClient } from '@/lib/supabase/server';

async function getDashboardStats() {
  if (!isSupabaseConfigured()) {
    return { published: 12, drafts: 0, unavailable: 1, categories: 12, collections: 3 };
  }
  const supabase = createServerClient();
  const [{ count: published }, { count: drafts }, { count: unavailable }, { count: categories }, { count: collections }] =
    await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('availability', 'temporarily_unavailable'),
      supabase.from('categories').select('*', { count: 'exact', head: true }).eq('is_visible', true),
      supabase.from('collections').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    ]);
  return { published: published ?? 0, drafts: drafts ?? 0, unavailable: unavailable ?? 0, categories: categories ?? 0, collections: collections ?? 0 };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  const configured = isSupabaseConfigured();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Vue d&apos;ensemble</h1>
          <p className="admin-page-subtitle">Bienvenue dans l&apos;interface d&apos;administration d&apos;Al Furqan.</p>
        </div>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          <Plus size={15} /> Ajouter un livre
        </Link>
      </div>

      {!configured && (
        <div className="admin-alert admin-alert-warning" style={{ marginBottom: 24 }}>
          <strong>⚠ Mode développement</strong> — Supabase non configuré. Données affichées depuis le seed local.
          Consultez <code>docs/SUPABASE_SETUP.md</code> pour connecter la base de données.
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat-label">Publiés</div>
          <div className="admin-stat-value">{stats.published}</div>
          <div className="admin-stat-link"><Link href="/admin/produits?status=published">Voir →</Link></div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Brouillons</div>
          <div className="admin-stat-value">{stats.drafts}</div>
          <div className="admin-stat-link"><Link href="/admin/produits?status=draft">Voir →</Link></div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Indisponibles</div>
          <div className="admin-stat-value">{stats.unavailable}</div>
          <div className="admin-stat-link"><Link href="/admin/produits?availability=unavailable">Voir →</Link></div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Catégories</div>
          <div className="admin-stat-value">{stats.categories}</div>
          <div className="admin-stat-link"><Link href="/admin/categories">Gérer →</Link></div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-label">Collections</div>
          <div className="admin-stat-value">{stats.collections}</div>
          <div className="admin-stat-link"><Link href="/admin/collections">Gérer →</Link></div>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Raccourcis rapides</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Link href="/admin/produits/nouveau" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Plus size={15} /> Ajouter un livre
          </Link>
          <Link href="/admin/produits" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <BookMarked size={15} /> Gérer les produits
          </Link>
          <Link href="/admin/categories" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Tag size={15} /> Gérer les catégories
          </Link>
          <Link href="/admin/collections" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <Library size={15} /> Gérer les collections
          </Link>
        </div>
      </div>
    </div>
  );
}
