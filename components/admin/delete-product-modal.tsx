'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { AdminModal } from './admin-modal';

export type DeletableProduct = {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
};

export type BulkDeleteResult = {
  deletedIds: string[];
  failedIds: string[];
  warnings: string[];
  errors: string[];
};

const STATUS_LABEL: Record<DeletableProduct['status'], string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
};

const CONFIRM_WORD = 'SUPPRIMER';

/**
 * The one place that calls the hard-delete endpoint from the Admin UI —
 * used by both the product list (single row + bulk selection) and the
 * product edit page's "Zone dangereuse", so the confirmation rules and the
 * request sequencing can never drift between the two entry points. The
 * server stays authoritative for the actual deletion (DB row, cascades,
 * Storage cleanup, revalidation) — this component only decides when it's
 * safe to ask for it.
 */
export function DeleteProductModal({
  products,
  onClose,
  onDeleted,
}: {
  /** Empty/null closes the modal. One entry = single-product confirmation; more = bulk. */
  products: DeletableProduct[] | null;
  onClose: () => void;
  onDeleted: (result: BulkDeleteResult) => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');

  const open = Boolean(products && products.length > 0);
  const list = products || [];
  const isBulk = list.length > 1;
  const anyPublished = list.some((p) => p.status === 'published');

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setDeleting(false);
      setProgress({ done: 0, total: 0 });
      setError('');
    }
  }, [open]);

  // A draft/archived deletion only needs the explicit destructive click
  // below — asking to also type a word for routine test-cleanup would
  // make that workflow needlessly painful. A published product (or any
  // bulk selection that includes one) needs a harder-to-misclick gate.
  const canConfirm = !deleting && (!anyPublished || confirmText.trim().toUpperCase() === CONFIRM_WORD);

  async function handleConfirm() {
    if (!canConfirm || list.length === 0) return;
    setDeleting(true);
    setError('');

    if (!isBulk) {
      try {
        const res = await fetch(`/api/admin/products/${list[0].id}?hard=true`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Erreur lors de la suppression.');
          setDeleting(false);
          return;
        }
        onDeleted({
          deletedIds: [list[0].id],
          failedIds: [],
          warnings: data.warning ? [data.warning] : [],
          errors: [],
        });
      } catch {
        setError('Erreur réseau lors de la suppression — le livre n\'a pas été supprimé.');
        setDeleting(false);
      }
      return;
    }

    // Bulk: one hardened DELETE at a time, never in parallel — a batch of
    // simultaneous destructive requests is exactly what this is meant to
    // avoid, and sequencing also lets a later item's failure never be
    // confused with an earlier item's success.
    const deletedIds: string[] = [];
    const failedIds: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < list.length; i++) {
      setProgress({ done: i, total: list.length });
      const p = list[i];
      try {
        const res = await fetch(`/api/admin/products/${p.id}?hard=true`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          deletedIds.push(p.id);
          if (data.warning) warnings.push(`« ${p.title} » : ${data.warning}`);
        } else {
          failedIds.push(p.id);
          errors.push(`« ${p.title} » : ${data.error || 'échec de la suppression'}`);
        }
      } catch {
        failedIds.push(p.id);
        errors.push(`« ${p.title} » : erreur réseau`);
      }
    }

    setProgress({ done: list.length, total: list.length });
    onDeleted({ deletedIds, failedIds, warnings, errors });
  }

  const previewTitles = list.slice(0, 5);
  const remainingCount = list.length - previewTitles.length;

  return (
    <AdminModal
      open={open}
      onClose={() => { if (!deleting) onClose(); }}
      title={isBulk ? `Supprimer définitivement ${list.length} livres ?` : 'Supprimer définitivement ce livre ?'}
      maxWidth={480}
    >
      {!isBulk && list[0] && (
        <div className="delete-modal-target">
          <span className="delete-modal-target-title">{list[0].title}</span>
          <span className={`status-badge status-${list[0].status}`}>{STATUS_LABEL[list[0].status]}</span>
        </div>
      )}

      {isBulk && (
        <ul className="delete-modal-preview-list">
          {previewTitles.map((p) => (
            <li key={p.id}>
              {p.title}
              {p.status === 'published' && <span className="status-badge status-published" style={{ marginLeft: 6 }}>Publié</span>}
            </li>
          ))}
          {remainingCount > 0 && <li className="delete-modal-preview-more">+ {remainingCount} autres</li>}
        </ul>
      )}

      <p className="field-hint" style={{ marginTop: 12 }}>
        {isBulk
          ? 'Cette action supprime définitivement ces livres et les données associées du catalogue (images, variantes).'
          : 'Cette action supprime définitivement ce livre et les données associées (images, variantes).'}
      </p>

      {anyPublished && (
        <div className="admin-alert admin-alert-warning" style={{ marginTop: 12 }}>
          <AlertTriangle size={16} />
          <span>
            {isBulk
              ? 'Cette sélection contient des livres publiés. Ils disparaîtront immédiatement de la boutique publique. Les éventuelles références panier/liste de souhaits seront retirées selon le comportement existant de la base de données.'
              : 'Ce livre est publié. Il disparaîtra immédiatement de la boutique publique. Les éventuelles références panier/liste de souhaits seront retirées selon le comportement existant de la base de données.'}
          </span>
        </div>
      )}

      <p className="delete-modal-irreversible">Cette action est irréversible.</p>

      {anyPublished && (
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label" htmlFor="delete-confirm-word">
            Tapez <strong>{CONFIRM_WORD}</strong> pour confirmer
          </label>
          <input
            id="delete-confirm-word"
            type="text"
            className="form-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={deleting}
            autoComplete="off"
            data-autofocus
          />
        </div>
      )}

      {deleting && isBulk && (
        <p className="field-hint" style={{ marginTop: 12 }}>
          Suppression en cours : {progress.done}/{progress.total}…
        </p>
      )}

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting}>
          Annuler
        </button>
        <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={!canConfirm}>
          {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
          <span>{deleting ? 'Suppression…' : 'Supprimer définitivement'}</span>
        </button>
      </div>
    </AdminModal>
  );
}
