'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { Availability } from '@/lib/types/ui';

const CATEGORIES = ['Coran', 'Tafsir', 'Invocations & Dhikr', 'Croyance & Foi', 'Spiritualité', 'Mariage', 'Femme', 'Jeunesse', 'Récits', 'Éducation', 'Arabe', 'Packs'];
const LANGUAGES = ['Français', 'Arabe', 'Français / Arabe', 'Wolof'];
const AVAILABILITY_OPTIONS: Availability[] = ['Disponible', 'Derniers exemplaires', 'De retour en stock', 'Indisponible temporairement'];
const COLORS = [
  { value: 'navy', label: 'Bleu marine' },
  { value: 'sand', label: 'Sable' },
  { value: 'terracotta', label: 'Terracotta' },
  { value: 'ochre', label: 'Ocre' },
  { value: 'sage', label: 'Vert sauge' },
  { value: 'slate', label: 'Ardoise' },
  { value: 'sky', label: 'Bleu ciel' },
  { value: 'blue', label: 'Bleu' },
  { value: 'plum', label: 'Prune' },
  { value: 'rose', label: 'Rose' },
  { value: 'ink', label: 'Encre' },
  { value: 'lavender', label: 'Lavande' },
];

type Variant = { id: string; attributes: string; price: string; stock: string };

type FormData = {
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  category: string;
  price: string;
  availability: Availability;
  stockQuantity: string;
  shortDescription: string;
  description: string;
  language: string;
  isbn: string;
  pages: string;
  dimensions: string;
  binding: string;
  edition: string;
  year: string;
  themes: string;
  reading: string;
  tajwid: boolean;
  featured: boolean;
  newArrival: boolean;
  status: 'draft' | 'published';
  color: string;
  hasVariants: boolean;
};

const DEFAULT_FORM: FormData = {
  title: '', subtitle: '', author: '', publisher: '', category: '',
  price: '', availability: 'Disponible', stockQuantity: '',
  shortDescription: '', description: '',
  language: 'Français', isbn: '', pages: '', dimensions: '',
  binding: '', edition: '', year: '',
  themes: '', reading: '', tajwid: false,
  featured: false, newArrival: false, status: 'draft',
  color: 'navy', hasVariants: false,
};

export function ProductForm({
  initialData,
  productId,
}: {
  initialData?: Partial<FormData>;
  productId?: string;
}) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM, ...initialData });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<{ file?: File; preview: string; uploading?: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
      if (file.size > 5 * 1024 * 1024) {
        setError(`Image "${file.name}" trop grande (max 5 Mo).`);
        return;
      }
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview }]);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), attributes: '', price: '', stock: '' },
    ]);
  };

  const removeVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof Variant, value: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim()) { setError('Le titre est obligatoire.'); return; }
    if (!form.category) { setError('La catégorie est obligatoire.'); return; }
    if (form.price && isNaN(parseInt(form.price))) { setError('Le prix doit être un nombre.'); return; }

    setSaving(true);

    try {
      const payload = {
        ...form,
        slug: generateSlug(form.title),
        price: form.price ? parseInt(form.price) : null,
        stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity) : null,
        pages: form.pages ? parseInt(form.pages) : null,
        year: form.year ? parseInt(form.year) : null,
        themes: form.themes.split(',').map((t) => t.trim()).filter(Boolean),
        variants: variants.map((v) => ({
          attributes: v.attributes,
          price: v.price ? parseInt(v.price) : null,
          stock: v.stock ? parseInt(v.stock) : null,
        })),
      };

      const url = productId
        ? `/api/admin/products/${productId}`
        : '/api/admin/products';
      const method = productId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde.');
        return;
      }

      setSuccess(productId ? 'Produit mis à jour.' : 'Produit créé en brouillon.');
      if (!productId && result.id) {
        setTimeout(() => router.push(`/admin/produits/${result.id}`), 1000);
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      {/* Section 1 — Informations principales */}
      <div className="form-section">
        <div className="form-section-title">1 — Informations principales</div>
        <div className="form-group">
          <label className="form-label" htmlFor="title">Titre <span style={{ color: 'red' }}>*</span></label>
          <input id="title" type="text" className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subtitle">Sous-titre <span className="form-label-optional">facultatif</span></label>
          <input id="subtitle" type="text" className="form-input" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="author">Auteur</label>
            <input id="author" type="text" className="form-input" value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Nom de l'auteur" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="publisher">Éditeur</label>
            <input id="publisher" type="text" className="form-input" value={form.publisher} onChange={(e) => set('publisher', e.target.value)} placeholder="Nom de l'éditeur" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="category">Catégorie <span style={{ color: 'red' }}>*</span></label>
          <select id="category" className="form-select" value={form.category} onChange={(e) => set('category', e.target.value)} required>
            <option value="">— Choisir une catégorie —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Section 2 — Commerce */}
      <div className="form-section">
        <div className="form-section-title">2 — Commerce</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="price">Prix (XOF)</label>
            <input id="price" type="number" className="form-input" value={form.price} onChange={(e) => set('price', e.target.value)} min={0} placeholder="Ex: 12500" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="stockQuantity">Stock <span className="form-label-optional">facultatif</span></label>
            <input id="stockQuantity" type="number" className="form-input" value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} min={0} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="availability">Disponibilité</label>
          <select id="availability" className="form-select" value={form.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
            {AVAILABILITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* Section 3 — Description */}
      <div className="form-section">
        <div className="form-section-title">3 — Description</div>
        <div className="form-group">
          <label className="form-label" htmlFor="shortDescription">Description courte <span className="form-label-optional">facultatif</span></label>
          <input id="shortDescription" type="text" className="form-input" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="Résumé en une phrase" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="description">Description</label>
          <textarea id="description" className="form-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} />
        </div>
      </div>

      {/* Section 4 — Bibliographique */}
      <div className="form-section">
        <div className="form-section-title">4 — Informations bibliographiques</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="language">Langue</label>
            <select id="language" className="form-select" value={form.language} onChange={(e) => set('language', e.target.value)}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="isbn">ISBN <span className="form-label-optional">facultatif</span></label>
            <input id="isbn" type="text" className="form-input" value={form.isbn} onChange={(e) => set('isbn', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="pages">Pages <span className="form-label-optional">facultatif</span></label>
            <input id="pages" type="number" className="form-input" value={form.pages} onChange={(e) => set('pages', e.target.value)} min={1} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="year">Année <span className="form-label-optional">facultatif</span></label>
            <input id="year" type="number" className="form-input" value={form.year} onChange={(e) => set('year', e.target.value)} min={1900} max={2099} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="dimensions">Dimensions <span className="form-label-optional">facultatif</span></label>
            <input id="dimensions" type="text" className="form-input" value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="Ex: 17 × 24 cm" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="binding">Reliure <span className="form-label-optional">facultatif</span></label>
            <input id="binding" type="text" className="form-input" value={form.binding} onChange={(e) => set('binding', e.target.value)} placeholder="Ex: Couverture rigide" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="edition">Édition <span className="form-label-optional">facultatif</span></label>
            <input id="edition" type="text" className="form-input" value={form.edition} onChange={(e) => set('edition', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Section 5 — Classification */}
      <div className="form-section">
        <div className="form-section-title">5 — Classification</div>
        <div className="form-group">
          <label className="form-label" htmlFor="themes">Thèmes <span className="form-label-optional">séparés par des virgules</span></label>
          <input id="themes" type="text" className="form-input" value={form.themes} onChange={(e) => set('themes', e.target.value)} placeholder="Ex: Tafsir, Coran, Compréhension" />
        </div>
        {form.category === 'Coran' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="reading">Lecture (Coran)</label>
              <select id="reading" className="form-select" value={form.reading} onChange={(e) => set('reading', e.target.value)}>
                <option value="">— Non spécifié —</option>
                <option value="Hafs">Hafs</option>
                <option value="Warsh">Warsh</option>
              </select>
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 20 }}>
                <input type="checkbox" checked={form.tajwid} onChange={(e) => set('tajwid', e.target.checked)} />
                <span>Tajwid (repères de lecture)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Section 6 — Couleur couverture */}
      <div className="form-section">
        <div className="form-section-title">6 — Couverture</div>
        <div className="admin-alert admin-alert-info">
          En attendant les vraies photos, le site affiche une couverture colorée générée automatiquement.
          Choisissez une couleur représentative de l&apos;ouvrage.
        </div>
        <div className="form-group">
          <label className="form-label">Couleur de couverture</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLORS.map((c) => (
              <label key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="radio"
                  name="color"
                  value={c.value}
                  checked={form.color === c.value}
                  onChange={() => set('color', c.value)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        {/* Upload images (futur) */}
        <div className="form-group">
          <label className="form-label">Photos <span className="form-label-optional">facultatif — JPG, PNG, WebP, max 5 Mo par image</span></label>
          <div
            className="upload-zone"
            onClick={() => document.getElementById('image-upload')?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleImageSelect(e.dataTransfer.files); }}
          >
            <Upload size={20} style={{ margin: '0 auto 8px', color: '#718096' }} />
            <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>
              Cliquez ou déposez vos images ici
            </p>
          </div>
          <input
            id="image-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleImageSelect(e.target.files)}
          />
          {images.length > 0 && (
            <div className="image-grid">
              {images.map((img, i) => (
                <div className="image-thumb" key={i}>
                  <img src={img.preview} alt="" />
                  <button
                    type="button"
                    className="image-thumb-remove"
                    onClick={() => removeImage(i)}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 7 — Variantes */}
      <div className="form-section">
        <div className="form-section-title">7 — Variantes</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={form.hasVariants}
            onChange={(e) => set('hasVariants', e.target.checked)}
          />
          Ce produit a plusieurs variantes (formats, couleurs, éditions…)
        </label>
        {form.hasVariants && (
          <>
            <div className="admin-alert admin-alert-info" style={{ marginBottom: 12 }}>
              Renseignez les attributs au format <code>Lecture: Warsh, Format: Moyen</code>
            </div>
            <div className="variant-list">
              {variants.map((v) => (
                <div className="variant-item" key={v.id}>
                  <input
                    type="text"
                    placeholder="Attributs (ex: Lecture: Warsh, Format: Moyen)"
                    value={v.attributes}
                    onChange={(e) => updateVariant(v.id, 'attributes', e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="Prix (XOF)"
                    value={v.price}
                    onChange={(e) => updateVariant(v.id, 'price', e.target.value)}
                    style={{ width: 100 }}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) => updateVariant(v.id, 'stock', e.target.value)}
                    style={{ width: 80 }}
                    className="form-input"
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeVariant(v.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addVariant}>
              <Plus size={14} /> Ajouter une variante
            </button>
          </>
        )}
      </div>

      {/* Section 8 — Publication */}
      <div className="form-section">
        <div className="form-section-title">8 — Publication</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Statut</label>
            <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value as 'draft' | 'published')}>
              <option value="draft">Brouillon — non visible sur le site</option>
              <option value="published">Publié — visible sur le site</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.newArrival} onChange={(e) => set('newArrival', e.target.checked)} />
            Nouveauté (affiché dans la section nouveautés)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
            Mis en avant (affiché en hero ou sections spéciales)
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {saving ? 'Enregistrement…' : productId ? 'Mettre à jour' : 'Créer le produit'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.push('/admin/produits')}>
          Annuler
        </button>
      </div>
    </form>
  );
}
