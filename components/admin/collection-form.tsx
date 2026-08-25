'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Eye, Loader2, Trash2 } from 'lucide-react';
import { CollectionProductPicker, type PickerProduct } from './collection-product-picker';

type FormData = {
  title: string;
  eyebrow: string;
  slug: string;
  description: string;
  status: 'draft' | 'published';
};

const DEFAULT_FORM: FormData = {
  title: '',
  eyebrow: '',
  slug: '',
  description: '',
  status: 'draft',
};

function generateSlugPreview(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function CollectionForm({
  initialData,
  collectionId,
}: {
  initialData?: Partial<FormData> & { products?: PickerProduct[] };
  collectionId?: string;
}) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM, ...initialData });
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData?.slug));
  const [products, setProducts] = useState<PickerProduct[]>(initialData?.products || []);
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const setField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (value: string) => {
    setField('title', value);
    if (!slugTouched) {
      setField('slug', generateSlugPreview(value));
    }
  };

  const handleSubmit = async (targetStatus: 'draft' | 'published') => {
    if (isSubmittingRef.current) return;
    setError('');
    setSuccess('');

    if (!form.title.trim()) {
      setError('Le titre de la collection est obligatoire.');
      return;
    }
    if (targetStatus === 'published' && !form.description.trim()) {
      setError('Une description est nécessaire pour publier une collection.');
      return;
    }

    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        eyebrow: form.eyebrow.trim() || null,
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || null,
        status: targetStatus,
        products: products.map((p, i) => ({ productId: p.id, position: i })),
      };

      const url = collectionId ? `/api/admin/collections/${collectionId}` : '/api/admin/collections';
      const method = collectionId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde de la collection.');
        return;
      }

      if (!collectionId && result.id) {
        router.push(`/admin/collections/${result.id}`);
        return;
      }

      setSuccess(targetStatus === 'published' ? 'Collection publiée.' : 'Collection enregistrée.');
      router.refresh();
    } catch {
      setError('Erreur réseau lors de la communication avec le serveur.');
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!collectionId) return;
    if (!confirm(
      'Supprimer cette collection ?\n\nCela retire uniquement la sélection éditoriale — aucun livre du catalogue ne sera supprimé.'
    )) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/collections');
      } else {
        const result = await res.json();
        alert(result.error || 'Erreur lors de la suppression.');
        setDeleting(false);
      }
    } catch {
      alert('Erreur réseau lors de la suppression.');
      setDeleting(false);
    }
  };

  return (
    <div className="product-form-root">
      <div className="form-actions-sticky">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/collections" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Toutes les collections</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{form.title || 'Nouvelle collection'}</span>
            <span className={`status-badge ${form.status === 'published' ? 'status-published' : 'status-draft'}`}>
              {form.status === 'published' ? 'Publiée' : 'Brouillon'}
            </span>
          </div>
        </div>

        <div className="form-actions-buttons">
          {collectionId && form.status === 'published' && form.slug && (
            <Link href={`/collections/${form.slug}`} target="_blank" className="btn btn-secondary btn-sm">
              <Eye size={14} />
              <span>Voir sur le site</span>
            </Link>
          )}
          {collectionId && (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={14} />
              <span>{deleting ? 'Suppression…' : 'Supprimer'}</span>
            </button>
          )}
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => handleSubmit('draft')}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            <span>Enregistrer brouillon</span>
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => handleSubmit('published')}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            <span>{collectionId ? 'Mettre à jour & Publier' : 'Publier la collection'}</span>
          </button>
        </div>
      </div>

      <div className="form-actions-mobile-bar">
        <div className="form-actions-mobile-primary">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => handleSubmit('draft')}>
            <span>Brouillon</span>
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => handleSubmit('published')}>
            <Check size={14} />
            <span>Publier</span>
          </button>
        </div>
        {collectionId && (
          <div className="form-actions-mobile-secondary">
            {form.status === 'published' && form.slug && (
              <Link href={`/collections/${form.slug}`} target="_blank" className="btn btn-secondary btn-sm">
                <Eye size={13} />
                <span>Voir sur le site</span>
              </Link>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={13} />
              <span>Supprimer</span>
            </button>
          </div>
        )}
      </div>

      {error && <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>{error}</div>}
      {success && <div className="admin-alert admin-alert-success" style={{ marginBottom: 20 }}>{success}</div>}

      <div className="admin-form-container">
        <div className="admin-form-main">
          <div className="form-section">
            <div className="form-section-title"><span>1 — Informations</span></div>

            <div className="form-group">
              <label className="form-label" htmlFor="collection-title">
                Titre de la collection <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="collection-title"
                type="text"
                className="form-input"
                placeholder="Ex: Pack Spécial Ramadan"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="collection-eyebrow">
                Sur-titre / eyebrow <span className="form-label-optional">facultatif</span>
              </label>
              <input
                id="collection-eyebrow"
                type="text"
                className="form-input"
                placeholder="Ex: Sélection éditoriale"
                value={form.eyebrow}
                onChange={(e) => setField('eyebrow', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="collection-description">
                Description {form.status === 'published' && <span style={{ color: 'var(--danger)' }}>*</span>}
              </label>
              <textarea
                id="collection-description"
                className="form-textarea"
                rows={4}
                placeholder="Présentez cette sélection en quelques phrases."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title"><span>2 — Livres associés</span></div>
            <CollectionProductPicker selected={products} onChange={setProducts} />
          </div>
        </div>

        <div className="admin-form-sidebar">
          <div className="form-section">
            <div className="form-section-title">Publication</div>

            <div className="form-group">
              <label className="form-label" htmlFor="collection-status">Statut</label>
              <select
                id="collection-status"
                className="form-select"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as 'draft' | 'published')}
              >
                <option value="draft">Brouillon — Masquée de la boutique</option>
                <option value="published">Publiée — Visible en ligne</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="collection-slug">Slug URL</label>
              <input
                id="collection-slug"
                type="text"
                className="form-input"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField('slug', e.target.value);
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>
                Identifiant de l&apos;URL publique sur /collections/[slug]
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
