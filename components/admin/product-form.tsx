'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Loader2, 
  Upload, 
  X, 
  Plus, 
  Trash2, 
  Eye, 
  Check, 
  BookOpen, 
  FileText, 
  Tag as TagIcon, 
  Image as ImageIcon, 
  Layers, 
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import type { Availability } from '@/lib/types/ui';

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Coran', slug: 'coran' },
  { id: '2', name: 'Tafsir', slug: 'tafsir' },
  { id: '3', name: 'Invocations & Dhikr', slug: 'invocations-dhikr' },
  { id: '4', name: 'Croyance & Foi', slug: 'croyance-foi' },
  { id: '5', name: 'Spiritualité', slug: 'spiritualite' },
  { id: '6', name: 'Mariage', slug: 'mariage' },
  { id: '7', name: 'Femme', slug: 'femme' },
  { id: '8', name: 'Jeunesse', slug: 'jeunesse' },
  { id: '9', name: 'Récits', slug: 'recits' },
  { id: '10', name: 'Éducation', slug: 'education' },
  { id: '11', name: 'Arabe', slug: 'arabe' },
  { id: '12', name: 'Packs', slug: 'packs' }
];

const LANGUAGES = ['Français', 'Arabe', 'Français / Arabe', 'Wolof'];

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'Disponible', label: 'En stock' },
  { value: 'Derniers exemplaires', label: 'Derniers exemplaires' },
  { value: 'De retour en stock', label: 'De retour en stock' },
  { value: 'Indisponible temporairement', label: 'Rupture / Indisponible' },
];

const COVER_COLORS = [
  { value: 'navy', label: 'Bleu marine', bg: '#0C2D38' },
  { value: 'gold', label: 'Or / Sable', bg: '#D9AA5E' },
  { value: 'terracotta', label: 'Terracotta', bg: '#9A3412' },
  { value: 'sage', label: 'Vert sauge', bg: '#15803D' },
  { value: 'plum', label: 'Prune / Violet', bg: '#581C87' },
  { value: 'slate', label: 'Ardoise / Gris', bg: '#334155' },
];

export type ImageItem = {
  id?: string;
  file?: File;
  preview: string;
  storagePath?: string;
  type: 'cover' | 'back' | 'spine' | 'inside' | 'toc' | 'other';
  position?: number;
  uploading?: boolean;
};

export type VariantItem = {
  id: string;
  attributes: string;
  price: string;
  stock: string;
};

type AuthorOption = { id: string; name: string };
type PublisherOption = { id: string; name: string };

type FormData = {
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  authorId: string;
  publisher: string;
  publisherId: string;
  category: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  availability: Availability;
  stockQuantity: string;
  weightG: string;
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
  status: 'draft' | 'published' | 'archived';
  color: string;
  hasVariants: boolean;
  images?: ImageItem[];
  variants?: VariantItem[];
};

const DEFAULT_FORM: FormData = {
  slug: '',
  title: '',
  subtitle: '',
  author: '',
  authorId: '',
  publisher: '',
  publisherId: '',
  category: '',
  categoryId: '',
  price: '',
  compareAtPrice: '',
  availability: 'Disponible',
  stockQuantity: '',
  weightG: '',
  shortDescription: '',
  description: '',
  language: 'Français',
  isbn: '',
  pages: '',
  dimensions: '',
  binding: '',
  edition: '',
  year: '',
  themes: '',
  reading: '',
  tajwid: false,
  featured: false,
  newArrival: false,
  status: 'draft',
  color: 'navy',
  hasVariants: false,
};

export function ProductForm({
  initialData,
  productId,
  categories: externalCategories,
}: {
  initialData?: Partial<FormData>;
  productId?: string;
  categories?: { id: string; name: string; slug: string }[];
}) {
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM, ...initialData });
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string; slug: string }[]>(
    externalCategories && externalCategories.length > 0 ? externalCategories : DEFAULT_CATEGORIES
  );
  const [variants, setVariants] = useState<VariantItem[]>(initialData?.variants || []);
  const [images, setImages] = useState<ImageItem[]>(initialData?.images || []);
  
  const [authorsList, setAuthorsList] = useState<AuthorOption[]>([]);
  const [publishersList, setPublishersList] = useState<PublisherOption[]>([]);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [newAuthorBio, setNewAuthorBio] = useState('');
  const [showPublisherModal, setShowPublisherModal] = useState(false);
  const [newPublisherName, setNewPublisherName] = useState('');
  const [newPublisherDesc, setNewPublisherDesc] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [biblioOpen, setBiblioOpen] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  
  const router = useRouter();

  // Charger les catégories de la DB si non transmises
  useEffect(() => {
    if (!externalCategories || externalCategories.length === 0) {
      fetch('/api/admin/categories')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setCategoriesList(data);
          }
        })
        .catch(() => {});
    }
  }, [externalCategories]);

  // Charger les auteurs et éditeurs
  useEffect(() => {
    async function loadOptions() {
      try {
        const [resA, resP] = await Promise.all([
          fetch('/api/admin/authors'),
          fetch('/api/admin/publishers')
        ]);
        if (resA.ok) {
          const dataA = await resA.json();
          setAuthorsList(dataA || []);
        }
        if (resP.ok) {
          const dataP = await resP.json();
          setPublishersList(dataP || []);
        }
      } catch {
        // Fallback
      }
    }
    loadOptions();
  }, []);

  const setField = (field: keyof FormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    if (!selectedVal) {
      setForm((prev) => ({ ...prev, category: '', categoryId: '' }));
      return;
    }
    const catObj = categoriesList.find((c) => c.id === selectedVal || c.name === selectedVal);
    if (catObj) {
      setForm((prev) => ({
        ...prev,
        category: catObj.name,
        categoryId: catObj.id,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        category: selectedVal,
        categoryId: '',
      }));
    }
  };

  // Upload d'images
  const handleImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`Format non supporté pour "${file.name}" (JPG, PNG, WebP uniquement).`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`Image "${file.name}" trop volumineuse (max 5 Mo).`);
        continue;
      }

      const tempPreview = URL.createObjectURL(file);
      const newImg: ImageItem = {
        file,
        preview: tempPreview,
        type: images.length === 0 ? 'cover' : 'inside',
        uploading: true,
        position: images.length,
      };

      setImages((prev) => [...prev, newImg]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (productId) formData.append('productId', productId);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.publicUrl) {
          setImages((prev) =>
            prev.map((img) =>
              img.preview === tempPreview
                ? { ...img, preview: data.publicUrl, storagePath: data.storagePath, uploading: false }
                : img
            )
          );
        } else {
          setImages((prev) => prev.filter((img) => img.preview !== tempPreview));
          setError(data.error || 'Échec de l\'upload de l\'image.');
        }
      } catch {
        setImages((prev) => prev.filter((img) => img.preview !== tempPreview));
        setError('Erreur réseau lors de l\'upload de l\'image.');
      }
    }
  };

  // Suppression d'image avec nettoyage du stockage
  const removeImage = async (index: number) => {
    const target = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));

    if (target && target.storagePath) {
      try {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: target.storagePath }),
        });
      } catch {
        // Silencieux
      }
    }
  };

  const setPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        type: i === index ? 'cover' : (img.type === 'cover' ? 'inside' : img.type),
      }))
    );
  };

  const handleQuickCreateAuthor = async () => {
    if (!newAuthorName.trim()) return;
    try {
      const res = await fetch('/api/admin/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAuthorName, bio: newAuthorBio }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setAuthorsList((prev) => [...prev, { id: data.id, name: data.name }]);
        setField('author', data.name);
        setField('authorId', data.id);
        setShowAuthorModal(false);
        setNewAuthorName('');
        setNewAuthorBio('');
      } else {
        alert(data.error || 'Erreur création auteur');
      }
    } catch {
      alert('Erreur lors de la création de l\'auteur.');
    }
  };

  const handleQuickCreatePublisher = async () => {
    if (!newPublisherName.trim()) return;
    try {
      const res = await fetch('/api/admin/publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPublisherName, description: newPublisherDesc }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setPublishersList((prev) => [...prev, { id: data.id, name: data.name }]);
        setField('publisher', data.name);
        setField('publisherId', data.id);
        setShowPublisherModal(false);
        setNewPublisherName('');
        setNewPublisherDesc('');
      } else {
        alert(data.error || 'Erreur création éditeur');
      }
    } catch {
      alert('Erreur lors de la création de l\'éditeur.');
    }
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), attributes: '', price: form.price, stock: form.stockQuantity },
    ]);
  };

  const removeVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof VariantItem, value: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Soumission globale avec validation différenciée Brouillon vs Publication
  const handleFormSubmit = async (e: React.FormEvent, targetStatus?: 'draft' | 'published' | 'archived') => {
    e.preventDefault();
    setError('');
    setWarning('');
    setSuccess('');

    const finalStatus = targetStatus || form.status;

    // 1. Validation de base (Titre requis même pour les brouillons)
    if (!form.title.trim()) {
      setError('Le titre du livre est obligatoire.');
      return;
    }

    // 2. Validation stricte pour la PUBLICATION
    if (finalStatus === 'published') {
      if (!form.category && !form.categoryId) {
        setError('Veuillez choisir une catégorie réelle avant de publier le livre.');
        return;
      }
      if (form.price === '' || isNaN(Number(form.price))) {
        setError('Un prix de vente valide (FCFA) est obligatoire pour publier un livre.');
        return;
      }
      if (form.stockQuantity === '' || isNaN(Number(form.stockQuantity))) {
        setError('Le stock disponible doit être explicitement renseigné (ex: 0, 10, etc.) avant de publier.');
        return;
      }

      // Avertissement non-bloquant si pas d'image
      const hasCover = images.some((img) => img.type === 'cover' || img.storagePath);
      if (!hasCover) {
        setWarning('Publication effectuée sans photo de couverture. Le visuel 3D virtuel sera affiché.');
      }
    }

    setSaving(true);

    try {
      const payload = {
        slug: form.slug.trim() || undefined,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        author: form.author.trim() || null,
        authorId: form.authorId || null,
        publisher: form.publisher.trim() || null,
        publisherId: form.publisherId || null,
        category: form.category || null,
        categoryId: form.categoryId || null,
        price: form.price !== '' ? Number(form.price) : null,
        compareAtPrice: form.compareAtPrice !== '' ? Number(form.compareAtPrice) : null,
        availability: form.availability,
        stockQuantity: form.stockQuantity !== '' ? Number(form.stockQuantity) : null,
        weightG: form.weightG !== '' ? Number(form.weightG) : null,
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        language: form.language,
        isbn: form.isbn.trim() || null,
        pages: form.pages !== '' ? Number(form.pages) : null,
        dimensions: form.dimensions.trim() || null,
        binding: form.binding.trim() || null,
        edition: form.edition.trim() || null,
        year: form.year !== '' ? Number(form.year) : null,
        themes: form.themes ? form.themes.split(',').map((t) => t.trim()).filter(Boolean) : [],
        reading: form.reading || null,
        tajwid: form.tajwid,
        featured: form.featured,
        newArrival: form.newArrival,
        status: finalStatus,
        color: form.color,
        hasVariants: form.hasVariants,
        images: images.filter(img => !img.uploading && img.storagePath).map((img, idx) => ({
          storagePath: img.storagePath,
          type: img.type,
          position: idx
        })),
        variants: form.hasVariants ? variants.map((v) => ({
          attributes: v.attributes,
          price: v.price !== '' ? Number(v.price) : null,
          stock: v.stock !== '' ? Number(v.stock) : null,
        })) : [],
      };

      const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
      const method = productId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Erreur lors de la sauvegarde du livre.');
        return;
      }

      setSuccess(
        productId 
          ? `Fiche mise à jour (${finalStatus === 'published' ? 'Publiée' : 'Brouillon'}).` 
          : `Livre enregistré avec succès.`
      );

      if (result.slug) {
        setForm((prev) => ({ ...prev, slug: result.slug }));
      }

      if (!productId && result.id) {
        setTimeout(() => router.push(`/admin/produits/${result.id}`), 800);
      } else {
        router.refresh();
      }
    } catch {
      setError('Erreur réseau lors de la communication avec le serveur.');
    } finally {
      setSaving(false);
    }
  };

  const isCoran = form.category === 'Coran' || form.title.toLowerCase().includes('coran');

  return (
    <div>
      {/* Barre d'actions sticky supérieure */}
      <div className="form-actions-sticky">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/produits" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Tous les livres</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {form.title ? form.title : 'Nouveau livre'}
            </span>
            <span className={`status-badge ${form.status === 'published' ? 'status-published' : 'status-draft'}`}>
              {form.status === 'published' ? 'Publié' : 'Brouillon'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(() => {
            const isUploading = images.some(img => img.uploading);
            return (
              <>
                {productId && form.status === 'published' && form.slug && (
                  <Link 
                    href={`/livres/${form.slug}`} 
                    target="_blank" 
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={14} />
                    <span>Voir sur le site</span>
                  </Link>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving || isUploading}
                  onClick={(e) => handleFormSubmit(e as any, 'draft')}
                >
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                  <span>{isUploading ? 'Upload en cours...' : 'Enregistrer brouillon'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || isUploading}
                  onClick={(e) => handleFormSubmit(e as any, 'published')}
                >
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                  <span>{isUploading ? 'Upload en cours...' : (productId ? 'Mettre à jour & Publier' : 'Publier le livre')}</span>
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {warning && (
        <div className="admin-alert admin-alert-warning" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>{warning}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" style={{ marginBottom: 20 }}>
          {success}
        </div>
      )}

      {/* Grille principale 2 colonnes */}
      <form onSubmit={(e) => handleFormSubmit(e, form.status)} className="admin-form-container">
        {/* COLONNE GAUCHE (70%) */}
        <div className="admin-form-main">
          
          {/* Section 1 : Informations essentielles */}
          <div className="form-section">
            <div className="form-section-title">
              <span>1 — Informations essentielles</span>
              <BookOpen size={16} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">
                Titre de l&apos;ouvrage <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="Ex: Le Jardin des Vertueux (Riyad as-Salihin)"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="subtitle">
                Sous-titre ou précision <span className="form-label-optional">facultatif</span>
              </label>
              <input
                id="subtitle"
                type="text"
                className="form-input"
                placeholder="Ex: Texte arabe et traduction française annotée"
                value={form.subtitle}
                onChange={(e) => setField('subtitle', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="shortDescription">
                Accroche / Résumé court <span className="form-label-optional">facultatif (affiché dans le catalogue)</span>
              </label>
              <input
                id="shortDescription"
                type="text"
                className="form-input"
                placeholder="Ex: Recueil fondamental d'enseignements et de comportements islamiques."
                value={form.shortDescription}
                onChange={(e) => setField('shortDescription', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description détaillée de l&apos;ouvrage
              </label>
              <textarea
                id="description"
                className="form-textarea"
                rows={5}
                placeholder="Présentation complète du livre, sommaire, utilité et contexte de l'auteur..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>
          </div>

          {/* Section 2 : Auteur & Éditeur */}
          <div className="form-section">
            <div className="form-section-title">
              <span>2 — Auteur & Éditeur</span>
              <FileText size={16} />
            </div>

            <div className="form-row">
              {/* Auteur */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" htmlFor="author" style={{ margin: 0 }}>Auteur</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--admin-petrol)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                    onClick={() => setShowAuthorModal(true)}
                  >
                    + Créer auteur
                  </button>
                </div>
                <input
                  id="author"
                  type="text"
                  className="form-input"
                  placeholder="Ex: L'Imam An-Nawawi"
                  value={form.author}
                  onChange={(e) => {
                    setField('author', e.target.value);
                    const found = authorsList.find((a) => a.name.toLowerCase() === e.target.value.toLowerCase());
                    setField('authorId', found ? found.id : '');
                  }}
                  list="authors-datalist"
                />
                <datalist id="authors-datalist">
                  {authorsList.map((a) => (
                    <option key={a.id} value={a.name} />
                  ))}
                </datalist>
              </div>

              {/* Éditeur */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" htmlFor="publisher" style={{ margin: 0 }}>Éditeur / Maison d&apos;édition</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--admin-petrol)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                    onClick={() => setShowPublisherModal(true)}
                  >
                    + Créer éditeur
                  </button>
                </div>
                <input
                  id="publisher"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Éditions Al-Hadith"
                  value={form.publisher}
                  onChange={(e) => {
                    setField('publisher', e.target.value);
                    const found = publishersList.find((p) => p.name.toLowerCase() === e.target.value.toLowerCase());
                    setField('publisherId', found ? found.id : '');
                  }}
                  list="publishers-datalist"
                />
                <datalist id="publishers-datalist">
                  {publishersList.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 3 : Prix & Stock */}
          <div className="form-section">
            <div className="form-section-title">
              <span>3 — Prix & Stock (FCFA / XOF)</span>
              <TagIcon size={16} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="price">
                  Prix de vente (FCFA) {form.status === 'published' && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="price"
                    type="number"
                    className="form-input"
                    placeholder="Ex: 12500"
                    min={0}
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 8, fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>F CFA</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="compareAtPrice">
                  Prix barré / d&apos;origine <span className="form-label-optional">facultatif (pour promotions)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="compareAtPrice"
                    type="number"
                    className="form-input"
                    placeholder="Ex: 15000"
                    min={0}
                    value={form.compareAtPrice}
                    onChange={(e) => setField('compareAtPrice', e.target.value)}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 8, fontSize: 12, color: 'var(--admin-text-muted)' }}>F CFA</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="stockQuantity">
                  Quantité en stock physique {form.status === 'published' && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <input
                  id="stockQuantity"
                  type="number"
                  className="form-input"
                  placeholder="Ex: 0, 5, 25"
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) => setField('stockQuantity', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="availability">
                  Statut de disponibilité
                </label>
                <select
                  id="availability"
                  className="form-select"
                  value={form.availability}
                  onChange={(e) => setField('availability', e.target.value as Availability)}
                >
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4 : Photos Supabase Storage */}
          <div className="form-section">
            <div className="form-section-title">
              <span>4 — Photos de l&apos;ouvrage</span>
              <ImageIcon size={16} />
            </div>

            <div className="form-group">
              <label className="form-label">Upload d&apos;images (JPG, PNG, WebP — max 5 Mo)</label>
              <div
                className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                onClick={() => document.getElementById('product-image-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleImageSelect(e.dataTransfer.files);
                }}
              >
                <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--admin-petrol)' }} />
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
                  Glissez-déposez vos photos ici ou cliquez pour choisir
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--admin-text-muted)' }}>
                  Couverture principale, quatrième de couverture, pages intérieures...
                </p>
              </div>

              <input
                id="product-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleImageSelect(e.target.files)}
              />

              {images.length > 0 && (
                <div className="image-preview-grid">
                  {images.map((img, i) => (
                    <div key={i} className="image-preview-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.preview} alt={`Aperçu ${i + 1}`} />
                      <button
                        type="button"
                        className="image-preview-remove"
                        onClick={() => removeImage(i)}
                        title="Supprimer la photo"
                      >
                        <X size={12} />
                      </button>
                      <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, padding: '2px 4px', fontSize: 9 }}
                          onClick={() => setPrimaryImage(i)}
                        >
                          {img.type === 'cover' ? '★ Couverture' : 'Définir princ.'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Couleur virtuelle de couverture */}
            <div className="form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--admin-border)' }}>
              <label className="form-label">Couleur de couverture virtuelle (Fallback 3D)</label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {COVER_COLORS.map((c) => (
                  <label key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                    <input
                      type="radio"
                      name="color"
                      value={c.value}
                      checked={form.color === c.value}
                      onChange={() => setField('color', c.value)}
                    />
                    <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: c.bg, border: '1px solid var(--admin-border)' }} />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5 : Informations bibliographiques */}
          <div className="form-section">
            <div 
              className="form-section-title"
              style={{ cursor: 'pointer', marginBottom: biblioOpen ? 16 : 0, borderBottom: biblioOpen ? undefined : 'none' }}
              onClick={() => setBiblioOpen(!biblioOpen)}
            >
              <span>5 — Informations bibliographiques</span>
              {biblioOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {biblioOpen && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="language">Langue de l&apos;ouvrage</label>
                    <select
                      id="language"
                      className="form-select"
                      value={form.language}
                      onChange={(e) => setField('language', e.target.value)}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="isbn">ISBN / Code EAN</label>
                    <input
                      id="isbn"
                      type="text"
                      className="form-input"
                      placeholder="Ex: 978-2-909469-11-2"
                      value={form.isbn}
                      onChange={(e) => setField('isbn', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="pages">Nombre de pages</label>
                    <input
                      id="pages"
                      type="number"
                      className="form-input"
                      placeholder="Ex: 480"
                      min={1}
                      value={form.pages}
                      onChange={(e) => setField('pages', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="year">Année de publication</label>
                    <input
                      id="year"
                      type="number"
                      className="form-input"
                      placeholder="Ex: 2023"
                      min={1900}
                      max={2099}
                      value={form.year}
                      onChange={(e) => setField('year', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="dimensions">Dimensions (Format)</label>
                    <input
                      id="dimensions"
                      type="text"
                      className="form-input"
                      placeholder="Ex: 17 × 24 cm"
                      value={form.dimensions}
                      onChange={(e) => setField('dimensions', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="binding">Type de reliure</label>
                    <input
                      id="binding"
                      type="text"
                      className="form-input"
                      placeholder="Ex: Couverture rigide dorée"
                      value={form.binding}
                      onChange={(e) => setField('binding', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="weightG">
                      Poids réel <span className="form-label-optional">facultatif — grammes</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="weightG"
                        type="number"
                        className="form-input"
                        placeholder="Ex: 850"
                        min={1}
                        step={1}
                        value={form.weightG}
                        onChange={(e) => setField('weightG', e.target.value)}
                      />
                      <span style={{ position: 'absolute', right: 12, top: 8, fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>g</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>
                      Poids réel de l&apos;ouvrage emballé. Utilisé uniquement pour estimer les frais La Poste au retrait — n&apos;affecte pas le prix. Laisser vide si inconnu.
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Section 6 : Options Coran (Conditionnel) */}
          {isCoran && (
            <div className="form-section" style={{ backgroundColor: 'var(--admin-ivory)', borderColor: 'var(--admin-warning-border)' }}>
              <div className="form-section-title" style={{ color: 'var(--admin-warning-text)' }}>
                <span>6 — Spécificités de l&apos;Édition du Coran</span>
                <BookOpen size={16} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="reading">Lecture (Riwaya)</label>
                  <select
                    id="reading"
                    className="form-select"
                    value={form.reading}
                    onChange={(e) => setField('reading', e.target.value)}
                  >
                    <option value="">— Sélectionner une lecture —</option>
                    <option value="Hafs">Hafs &apos;an &apos;Asim (حفص عن عاصم)</option>
                    <option value="Warsh">Warsh &apos;an Nafi&apos; (ورش عن نافع)</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, paddingTop: 16 }}>
                    <input
                      type="checkbox"
                      checked={form.tajwid}
                      onChange={(e) => setField('tajwid', e.target.checked)}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--admin-warning-text)' }}>Tajwid (Code couleur repères de récitation)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Section 7 : Variantes de produit */}
          <div className="form-section">
            <div className="form-section-title">
              <span>7 — Variantes d&apos;ouvrage (Formats, Couleurs)</span>
              <Layers size={16} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={form.hasVariants}
                onChange={(e) => setField('hasVariants', e.target.checked)}
              />
              <span>Ce livre possède plusieurs variantes (Format Moyen / Grand, Couleurs, etc.)</span>
            </label>

            {form.hasVariants && (
              <div style={{ marginTop: 12 }}>
                <div className="admin-alert admin-alert-info">
                  Indiquez les attributs au format <code>Format: Grand, Couleur: Vert</code>.
                </div>

                {variants.map((v) => (
                  <div key={v.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 2 }}
                      placeholder="Ex: Format: Grand, Reliure: Cuir"
                      value={v.attributes}
                      onChange={(e) => updateVariant(v.id, 'attributes', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder="Prix FCFA"
                      value={v.price}
                      onChange={(e) => updateVariant(v.id, 'price', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) => updateVariant(v.id, 'stock', e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeVariant(v.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={addVariant}
                >
                  <Plus size={14} /> Ajouter une variante
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE (30%) */}
        <div className="admin-form-sidebar">
          
          {/* Card Statut & Catégorie */}
          <div className="form-section">
            <div className="form-section-title">Publication & Catégorie</div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">Statut de publication</label>
              <select
                id="status"
                className="form-select"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as any)}
              >
                <option value="draft">Brouillon — Masqué de la boutique</option>
                <option value="published">Publié — Visible en ligne</option>
                <option value="archived">Archivé — Retiré de la vente</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category-select">Catégorie {form.status === 'published' && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
              <select
                id="category-select"
                className="form-select"
                value={form.categoryId || form.category}
                onChange={handleCategoryChange}
              >
                <option value="">— Choisir une catégorie —</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id || c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="slug">Slug URL personnalisable</label>
              <input
                id="slug"
                type="text"
                className="form-input"
                placeholder="Ex: le-jardin-des-vertueux"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--admin-text-subtle)' }}>
                Identifiant de l&apos;URL publique sur /livres/[slug]
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="themes">Mots-clés / Thèmes</label>
              <input
                id="themes"
                type="text"
                className="form-input"
                placeholder="Tafsir, Sunnah, Croyance"
                value={form.themes}
                onChange={(e) => setField('themes', e.target.value)}
              />
            </div>
          </div>

          {/* Card Mise en avant */}
          <div className="form-section">
            <div className="form-section-title">Mise en avant éditoriale</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField('featured', e.target.checked)}
                />
                <span><strong>Mettre en avant</strong> (Affiché en vedette sur l&apos;accueil)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.newArrival}
                  onChange={(e) => setField('newArrival', e.target.checked)}
                />
                <span><strong>Nouveauté</strong> (Badge Nouveauté)</span>
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* Modal Auteur */}
      {showAuthorModal && (
        <div className="admin-drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="admin-card" style={{ maxWidth: 450, width: '100%', margin: 'auto', backgroundColor: 'var(--admin-surface)', position: 'relative' }}>
            <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Créer un nouvel auteur</h3>
            <div className="form-group">
              <label className="form-label">Nom de l&apos;auteur *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Cheikh Ibn Baz"
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Biographie succincte</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Érudit musulman né à Riyad..."
                value={newAuthorBio}
                onChange={(e) => setNewAuthorBio(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAuthorModal(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleQuickCreateAuthor}>
                Enregistrer l&apos;auteur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Éditeur */}
      {showPublisherModal && (
        <div className="admin-drawer-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="admin-card" style={{ maxWidth: 450, width: '100%', margin: 'auto', backgroundColor: 'var(--admin-surface)', position: 'relative' }}>
            <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 700 }}>Créer un éditeur</h3>
            <div className="form-group">
              <label className="form-label">Nom de la maison d&apos;édition *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Éditions Darussalam"
                value={newPublisherName}
                onChange={(e) => setNewPublisherName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Présentation</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Maison d'édition spécialisée..."
                value={newPublisherDesc}
                onChange={(e) => setNewPublisherDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPublisherModal(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleQuickCreatePublisher}>
                Enregistrer l&apos;éditeur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
