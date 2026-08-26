'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Edit2, Eye, Search, Plus, Archive, BookOpen, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Cover } from '@/components/books/cover';
import { QuickStockEditor } from './quick-stock-editor';
import { CsvImportModal } from './csv-import-modal';
import { DeleteProductModal, type BulkDeleteResult, type DeletableProduct } from './delete-product-modal';
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
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeletableProduct[] | null>(null);
  const [resultMessage, setResultMessage] = useState<{ text: string; tone: 'success' | 'warning' } | null>(null);
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const router = useRouter();

  // `revalidatePath` runs server-side inside our mutation route handlers
  // (create/update/archive/quick-stock), which correctly busts the server
  // caches — but a Route Handler has no way to tell an already-loaded
  // client to drop its own Router Cache entry for this page (that signal
  // only exists for Server Actions). Without this, returning here shortly
  // after a mutation could still show the pre-mutation cached list. One
  // guaranteed-fresh refetch per visit is a fine trade for an internal,
  // low-traffic operational screen — this is the "fresh correctness over
  // static caching" call for Admin.
  const hasRefreshedRef = useRef(false);
  useEffect(() => {
    if (hasRefreshedRef.current) return;
    hasRefreshedRef.current = true;
    router.refresh();
  }, [router]);

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
      } else {
        alert('Erreur lors de la modification du statut.');
      }
    } catch {
      alert('Erreur lors de la modification du statut.');
    } finally {
      setArchivingId(null);
    }
  };

  // "Select all" only ever targets the CURRENT FILTERED RESULTS — a
  // filter never silently pulls hidden rows into the selection, and
  // narrowing the filter never drops an already-selected row still off
  // screen (the operator's own individual picks are left alone).
  const filteredIds = useMemo(() => filteredProducts.map((p) => p.id), [filteredProducts]);
  const selectedInFilteredCount = useMemo(
    () => filteredIds.filter((id) => selectedIds.has(id)).length,
    [filteredIds, selectedIds]
  );
  const allFilteredSelected = filteredIds.length > 0 && selectedInFilteredCount === filteredIds.length;
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedInFilteredCount > 0 && !allFilteredSelected;
    }
  }, [selectedInFilteredCount, allFilteredSelected]);

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  const handleDeleted = (result: BulkDeleteResult) => {
    setDeleteTarget(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      result.deletedIds.forEach((id) => next.delete(id));
      // Failed rows stay selected on purpose — the operator can inspect
      // the error and retry without having to re-pick them.
      return next;
    });

    const messages: string[] = [];
    if (result.deletedIds.length > 0) {
      messages.push(
        result.deletedIds.length === 1
          ? '1 livre supprimé.'
          : `${result.deletedIds.length} livres supprimés.`
      );
    }
    if (result.failedIds.length > 0) {
      messages.push(result.failedIds.length === 1 ? '1 échec.' : `${result.failedIds.length} échecs.`);
    }
    let tone: 'success' | 'warning' = result.failedIds.length > 0 || result.warnings.length > 0 ? 'warning' : 'success';
    const detail = [...result.errors, ...result.warnings];
    setResultMessage({
      text: messages.join(' ') + (detail.length > 0 ? ' ' + detail.join(' · ') : ''),
      tone,
    });

    if (result.deletedIds.length > 0) {
      router.refresh();
    }
  };

  const handleBulkArchive = async () => {
    const targets = selectedProducts.filter((p) => p.status !== 'archived');
    if (targets.length === 0) return;
    if (!confirm(`Archiver ${targets.length} livre(s) ? Ils ne seront plus affichés dans la boutique.`)) return;
    setBulkArchiving(true);
    let successCount = 0;
    let failCount = 0;
    for (const p of targets) {
      try {
        const res = await fetch(`/api/admin/products/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    setBulkArchiving(false);
    setResultMessage({
      text: failCount > 0
        ? `${successCount} livre(s) archivé(s), ${failCount} échec(s).`
        : `${successCount} livre(s) archivé(s).`,
      tone: failCount > 0 ? 'warning' : 'success',
    });
    if (successCount > 0) router.refresh();
  };

  const counts = useMemo(() => ({
    all: products.length,
    published: products.filter(p => p.status === 'published').length,
    drafts: products.filter(p => p.status === 'draft').length,
    archived: products.filter(p => p.status === 'archived').length,
  }), [products]);

  return (
    <>
      {resultMessage && (
        <div className={`admin-alert admin-alert-${resultMessage.tone}`} style={{ marginBottom: 16 }}>
          <span>{resultMessage.text}</span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="admin-bulk-bar">
          <span className="admin-bulk-bar-count">{selectedIds.size} livre(s) sélectionné(s)</span>
          <div className="admin-bulk-bar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleBulkArchive} disabled={bulkArchiving}>
              <Archive size={13} />
              <span>Archiver</span>
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(selectedProducts)}>
              <Trash2 size={13} />
              <span>Supprimer définitivement</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>
              Annuler la sélection
            </button>
          </div>
        </div>
      )}

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

        <div className="admin-toolbar-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setCsvModalOpen(true)}
          >
            <FileSpreadsheet size={14} />
            <span>Importer CSV</span>
          </button>
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

      {/* Phone: a dedicated compact list, not the desktop table squeezed into
          390px with a horizontal scrollbar (that tolerance is revoked — see
          Phase I). Same `filteredProducts`, same `handleArchive`, same
          QuickStockEditor as the table below; only the markup differs. */}
      <div className="admin-mobile-list">
        {filteredProducts.length === 0 ? (
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
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="admin-mobile-card">
              <div className="admin-mobile-card-head">
                <label className="admin-select-touch" aria-label={`Sélectionner ${product.title}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                  />
                </label>
                <div className="admin-mobile-cover">
                  {product.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={product.coverUrl} alt={product.title} />
                  ) : (
                    <Cover product={product as any} small />
                  )}
                </div>
                <div className="admin-mobile-card-titleblock">
                  <Link href={`/admin/produits/${product.id}`} className="admin-mobile-card-title">
                    {product.title}
                  </Link>
                  <div className="admin-mobile-card-author">{product.author}</div>
                </div>
              </div>

              <div className="admin-mobile-card-row">
                <span className="admin-mobile-card-category">{product.category}</span>
                <span className="admin-mobile-card-price">{formatPrice(product.price)}</span>
              </div>

              <div className="admin-mobile-card-row">
                <StatusBadge status={product.status} />
                <QuickStockEditor productId={product.id} currentAvailability={product.availability} />
              </div>

              <div className="admin-mobile-card-date">Modifié le {formatDate(product.updatedAt)}</div>

              <div className="admin-mobile-card-actions">
                <Link
                  href={`/admin/produits/${product.id}`}
                  className="btn btn-secondary btn-sm"
                  aria-label={`Modifier la fiche de ${product.title}`}
                >
                  <Edit2 size={13} /> Modifier
                </Link>
                {product.status === 'published' && (
                  <Link
                    href={`/livres/${product.slug}`}
                    target="_blank"
                    className="btn btn-secondary btn-sm"
                    aria-label={`Voir ${product.title} sur la boutique`}
                  >
                    <Eye size={13} /> Voir
                  </Link>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleArchive(product.id, product.status)}
                  disabled={archivingId === product.id}
                  aria-label={`${product.status === 'archived' ? 'Désarchiver' : 'Archiver'} ${product.title}`}
                >
                  <Archive size={13} style={{ color: product.status === 'archived' ? 'var(--admin-gold)' : undefined }} />
                </button>
              </div>

              <button
                type="button"
                className="btn btn-danger btn-sm admin-mobile-delete-btn"
                onClick={() => setDeleteTarget([product])}
                aria-label={`Supprimer définitivement ${product.title}`}
              >
                <Trash2 size={13} />
                <span>Supprimer</span>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="admin-table-wrap product-admin-desktop-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  aria-label="Sélectionner tous les livres affichés"
                />
              </th>
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
                <td colSpan={9} style={{ padding: 0 }}>
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
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      aria-label={`Sélectionner ${product.title}`}
                    />
                  </td>
                  <td>
                    <div style={{ width: 36, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-surface-muted)' }}>
                      {product.coverUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={product.coverUrl} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                        aria-label={`Modifier la fiche de ${product.title}`}
                      >
                        <Edit2 size={13} />
                      </Link>

                      {product.status === 'published' && (
                        <Link
                          href={`/livres/${product.slug}`}
                          target="_blank"
                          className="btn btn-secondary btn-sm"
                          title="Voir sur la boutique"
                          aria-label={`Voir ${product.title} sur la boutique`}
                        >
                          <Eye size={13} />
                        </Link>
                      )}

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleArchive(product.id, product.status)}
                        disabled={archivingId === product.id}
                        title={product.status === 'archived' ? 'Désarchiver' : 'Archiver'}
                        aria-label={`${product.status === 'archived' ? 'Désarchiver' : 'Archiver'} ${product.title}`}
                      >
                        <Archive size={13} style={{ color: product.status === 'archived' ? 'var(--admin-gold)' : undefined }} />
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget([product])}
                        title="Supprimer définitivement"
                        aria-label={`Supprimer définitivement ${product.title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CsvImportModal isOpen={csvModalOpen} onClose={() => setCsvModalOpen(false)} />

      <DeleteProductModal
        products={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </>
  );
}
