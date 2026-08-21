'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Edit2, Eye, Search, Plus, Archive, BookOpen } from 'lucide-react';
import { Cover } from '@/components/books/cover';
import { QuickStockEditor } from './quick-stock-editor';
import type { Availability } from '@/lib/types/ui';
import { useRouter } from 'next/navigation';

export type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  isbn?: string | null;
  author: string;
  category: string;
  price: number;
  status: 'published' | 'draft' | 'archived';
  availability: Availability;
  stockQuantity: number;
  updatedAt: string;
  color: string;
  ink: string;
  coverUrl?: string | null;
};

function StatusBadge({ status }: { status: AdminProduct['status'] }) {
  const map = {
    published: { label: 'Publié', className: 'status-published' },
    draft: { label: 'Brouillon', className: 'status-draft' },
    archived: { label: 'Archivé', className: 'status-archived' },
  };
  const { label, className } = map[status] || map.draft;
  return <span className={`status-badge ${className}`}>{label}</span>;
}

function formatPrice(price: number) {
  if (!price || price === 0) return 'Gratuit / N.C.';
  return `${price.toLocaleString('fr-FR')} F CFA`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function ProductListTable({ 
  products, 
  categories = [] 
}: { 
  products: AdminProduct[];
  categories?: string[];
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const router = useRouter();

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const query = search.toLowerCase().trim();
      const matchSearch = !query || 
        p.title.toLowerCase().includes(query) || 
        p.author.toLowerCase().includes(query) ||
        (p.isbn && p.isbn.toLowerCase().includes(query)) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(query));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      
      let matchAvailability = true;
      if (availabilityFilter === 'in_stock') {
        matchAvailability = p.stockQuantity > 3 && p.availability === 'Disponible';
      } else if (availabilityFilter === 'low_stock') {
        matchAvailability = p.stockQuantity > 0 && p.stockQuantity <= 3;
      } else if (availabilityFilter === 'out_of_stock') {
        matchAvailability = p.stockQuantity === 0 || p.availability === 'Indisponible temporairement';
      }

      return matchSearch && matchStatus && matchCategory && matchAvailability;
    });
  }, [products, search, statusFilter, categoryFilter, availabilityFilter]);

  const handleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'draft' : 'archived';
    if (!confirm(newStatus === 'archived' ? 'Archiver ce livre ? Il ne sera plus affiché dans la boutique.' : 'Désarchiver ce livre ?')) return;

    setArchivingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      alert('Erreur lors de la modification du statut.');
    } finally {
      setArchivingId(null);
    }
  };

  const counts = useMemo(() => ({
    all: products.length,
    published: products.filter(p => p.status === 'published').length,
    drafts: products.filter(p => p.status === 'draft').length,
    archived: products.filter(p => p.status === 'archived').length,
  }), [products]);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--admin-border)', paddingBottom: 12, overflowX: 'auto' }}>
        <button
          className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('all')}
        >
          Tous ({counts.all})
        </button>
        <button
          className={`btn btn-sm ${statusFilter === 'published' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('published')}
        >
          Publiés ({counts.published})
        </button>
        <button
          className={`btn btn-sm ${statusFilter === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setStatusFilter('draft')}
        >
          Brouillons ({counts.drafts})
        </button>
        {counts.archived > 0 && (
          <button
            className={`btn btn-sm ${statusFilter === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('archived')}
          >
            Archivés ({counts.archived})
          </button>
        )}
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Rechercher par titre, auteur, ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: 140 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            <option value="all">Toutes disponibilités</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock faible (≤ 3)</option>
            <option value="out_of_stock">Rupture de stock</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>Affichage de {filteredProducts.length} sur {products.length} livre(s)</span>
        {(search || statusFilter !== 'all' || categoryFilter !== 'all' || availabilityFilter !== 'all') && (
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--admin-petrol)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
            onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setAvailabilityFilter('all'); }}
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>Visuel</th>
              <th>Titre & Édition</th>
              <th>Catégorie</th>
              <th>Prix</th>
              <th>Stock / Dispo</th>
              <th>Statut</th>
              <th>Modifié</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 0 }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="empty-state-title">Aucun livre ne correspond</h3>
                    <p className="empty-state-text">
                      {products.length === 0 
                        ? 'Le catalogue est actuellement vide. Ajoutez le premier livre d\'Al Furqan.'
                        : 'Modifiez vos critères de recherche ou réinitialisez les filtres.'}
                    </p>
                    {products.length === 0 && (
                      <Link href="/admin/produits/nouveau" className="btn btn-primary">
                        <Plus size={15} /> Ajouter un livre
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div style={{ width: 36, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--admin-border)' }}>
                      {product.coverUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={product.coverUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Cover product={product as any} small />
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <Link 
                        href={`/admin/produits/${product.id}`}
                        style={{ fontWeight: 600, color: 'var(--admin-text)', textDecoration: 'none' }}
                      >
                        {product.title}
                      </Link>
                      {product.subtitle && (
                        <div style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>{product.subtitle}</div>
                      )}
                      <div style={{ color: 'var(--admin-text-subtle)', fontSize: 11, marginTop: 2 }}>
                        Auteur : <strong>{product.author}</strong> {product.isbn ? `• ISBN ${product.isbn}` : ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, backgroundColor: 'var(--admin-surface-muted)', border: '1px solid var(--admin-border)' }}>
                      {product.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatPrice(product.price)}
                  </td>
                  <td>
                    <QuickStockEditor
                      productId={product.id}
                      currentAvailability={product.availability}
                    />
                  </td>
                  <td>
                    <StatusBadge status={product.status} />
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(product.updatedAt)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link 
                        href={`/admin/produits/${product.id}`} 
                        className="btn btn-secondary btn-sm"
                        title="Modifier la fiche"
                      >
                        <Edit2 size={13} />
                      </Link>

                      {product.status === 'published' && (
                        <Link 
                          href={`/livres/${product.slug}`} 
                          target="_blank" 
                          className="btn btn-secondary btn-sm"
                          title="Voir sur la boutique"
                        >
                          <Eye size={13} />
                        </Link>
                      )}

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleArchive(product.id, product.status)}
                        disabled={archivingId === product.id}
                        title={product.status === 'archived' ? 'Désarchiver' : 'Archiver'}
                      >
                        <Archive size={13} style={{ color: product.status === 'archived' ? 'var(--admin-gold)' : undefined }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
