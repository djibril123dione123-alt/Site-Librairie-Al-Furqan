'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Edit2, Copy, Eye, Search } from 'lucide-react';
import { Cover } from '@/components/books/cover';
import { QuickStockEditor } from './quick-stock-editor';
import type { Availability } from '@/lib/types/ui';

type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  status: 'published' | 'draft' | 'archived';
  availability: Availability;
  updatedAt: string;
  color: string;
  ink: string;
};

function StatusBadge({ status }: { status: AdminProduct['status'] }) {
  const map = {
    published: { label: 'Publié', className: 'status-published' },
    draft: { label: 'Brouillon', className: 'status-draft' },
    archived: { label: 'Archivé', className: 'status-archived' },
  };
  const { label, className } = map[status];
  return <span className={`status-badge ${className}`}>{label}</span>;
}

function AvailabilityBadge({ availability }: { availability: Availability }) {
  const map: Record<Availability, { label: string; className: string }> = {
    'Disponible': { label: 'Disponible', className: 'status-in-stock' },
    'Derniers exemplaires': { label: 'Derniers ex.', className: 'status-low' },
    'De retour en stock': { label: 'Retour', className: 'status-restocked' },
    'Indisponible temporairement': { label: 'Indisponible', className: 'status-unavailable' },
  };
  const { label, className } = map[availability];
  return <span className={`status-badge ${className}`}>{label}</span>;
}

function formatPrice(price: number) {
  return `${price.toLocaleString('fr-FR')} F`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function ProductListTable({ products }: { products: AdminProduct[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={14} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Rechercher par titre ou auteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
        >
          <option value="all">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Couverture</th>
                <th>Titre</th>
                <th>Prix</th>
                <th>Stock / Dispo</th>
                <th>Statut</th>
                <th>Modifié</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718096' }}>
                    Aucun produit trouvé.
                  </td>
                </tr>
              )}
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td style={{ width: 48 }}>
                    <div style={{ width: 36, flexShrink: 0 }}>
                      <Cover product={product as any} small />
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong style={{ fontSize: 13 }}>{product.title}</strong>
                      <div style={{ color: '#718096', fontSize: 12 }}>{product.author}</div>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatPrice(product.price)}</td>
                  <td>
                    <QuickStockEditor
                      productId={product.id}
                      currentAvailability={product.availability}
                    />
                  </td>
                  <td>
                    <StatusBadge status={product.status} />
                  </td>
                  <td style={{ color: '#718096', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDate(product.updatedAt)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/produits/${product.id}`} className="btn btn-secondary btn-sm" title="Modifier">
                        <Edit2 size={13} />
                      </Link>
                      <Link href={`/livres/${product.slug}`} target="_blank" className="btn btn-secondary btn-sm" title="Voir sur le site">
                        <Eye size={13} />
                      </Link>
                      <Link href={`/admin/produits/${product.id}/dupliquer`} className="btn btn-secondary btn-sm" title="Dupliquer">
                        <Copy size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
