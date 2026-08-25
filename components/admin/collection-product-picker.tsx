'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X, Search } from 'lucide-react';

export type PickerProduct = {
  id: string;
  slug: string;
  title: string;
  isbn?: string | null;
  price: number | null;
  status: 'draft' | 'published' | 'archived';
  author: string | null;
  publisher: string | null;
  coverUrl: string | null;
};

function StatusBadge({ status }: { status: PickerProduct['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    published: { label: 'Publié', className: 'status-published' },
    draft: { label: 'Brouillon', className: 'status-draft' },
    archived: { label: 'Archivé', className: 'status-archived' },
  };
  const { label, className } = map[status] || map.draft;
  return <span className={`status-badge ${className}`}>{label}</span>;
}

function ProductThumb({ product }: { product: Pick<PickerProduct, 'coverUrl' | 'title'> }) {
  return (
    <div className="collection-picker-thumb">
      {product.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.coverUrl} alt="" />
      ) : (
        <span aria-hidden="true">✦</span>
      )}
    </div>
  );
}

/**
 * Searchable book selector for a collection, plus explicit ordering of the
 * already-selected list. Deliberately keyboard-first (move up/down buttons)
 * rather than drag-only — Phase L §5 treats drag as optional, not required.
 */
export function CollectionProductPicker({
  selected,
  onChange,
}: {
  selected: PickerProduct[];
  onChange: (next: PickerProduct[]) => void;
}) {
  const [allProducts, setAllProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((data) => setAllProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter((p) => !selectedIds.has(p.id))
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.author && p.author.toLowerCase().includes(q)) ||
          (p.isbn && p.isbn.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [allProducts, query, selectedIds]);

  function addProduct(p: PickerProduct) {
    onChange([...selected, p]);
    setQuery('');
  }

  function removeProduct(id: string) {
    onChange(selected.filter((p) => p.id !== id));
  }

  function moveProduct(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="collection-picker">
      <div className="collection-picker-search">
        <Search size={15} className="admin-search-icon" />
        <input
          type="text"
          className="admin-search-input"
          placeholder="Rechercher par titre, auteur, ISBN…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
      </div>

      {query.trim() && (
        <div className="collection-picker-results">
          {results.length === 0 ? (
            <p className="field-hint" style={{ padding: '10px 4px' }}>Aucun livre ne correspond.</p>
          ) : (
            results.map((p) => (
              <div key={p.id} className="collection-picker-row">
                <ProductThumb product={p} />
                <div className="collection-picker-row-info">
                  <strong>{p.title}</strong>
                  <span className="field-hint">
                    {[p.author, p.publisher].filter(Boolean).join(' · ') || 'Auteur/éditeur non renseigné'}
                    {p.price ? ` · ${p.price.toLocaleString('fr-FR')} F CFA` : ''}
                  </span>
                </div>
                <StatusBadge status={p.status} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addProduct(p)}>
                  <Plus size={13} />
                  <span>Ajouter</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="collection-picker-selected">
        <span className="form-label">{selected.length} livre{selected.length > 1 ? 's' : ''} associé{selected.length > 1 ? 's' : ''}</span>
        {selected.length === 0 ? (
          <p className="field-hint">Aucun livre associé pour le moment — recherchez ci-dessus pour en ajouter.</p>
        ) : (
          <div className="collection-picker-list">
            {selected.map((p, i) => (
              <div key={p.id} className="collection-picker-row">
                <ProductThumb product={p} />
                <div className="collection-picker-row-info">
                  <strong>{p.title}</strong>
                  <span className="field-hint">
                    {[p.author, p.publisher].filter(Boolean).join(' · ') || 'Auteur/éditeur non renseigné'}
                  </span>
                </div>
                <StatusBadge status={p.status} />
                <div className="collection-picker-move">
                  <button
                    type="button"
                    onClick={() => moveProduct(i, -1)}
                    disabled={i === 0}
                    aria-label={`Monter ${p.title}`}
                    title="Monter"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProduct(i, 1)}
                    disabled={i === selected.length - 1}
                    aria-label={`Descendre ${p.title}`}
                    title="Descendre"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  className="collection-picker-remove"
                  onClick={() => removeProduct(p.id)}
                  aria-label={`Retirer ${p.title} de la collection`}
                  title="Retirer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {selected.some((p) => p.status !== 'published') && (
          <p className="field-hint" style={{ marginTop: 8 }}>
            Les livres en brouillon ou archivés associés ne s&apos;afficheront pas sur la collection publique tant qu&apos;ils ne sont pas publiés.
          </p>
        )}
      </div>
    </div>
  );
}
