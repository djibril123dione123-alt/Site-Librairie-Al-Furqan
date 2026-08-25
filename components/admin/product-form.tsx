'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy
} from 'lucide-react';
import type { Availability } from '@/lib/types/ui';
import { AdminModal } from './admin-modal';
import { CoverCropModal } from './cover-crop-modal';

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
  // Present only once this exact image has been cropped at least once —
  // see lib/admin/crop-math.ts and the /crop API routes. Carried through
  // every save so the delete-all/reinsert-all image sync (see the products
  // PUT route) never silently drops an already-applied crop.
  originalStoragePath?: string;
  cropData?: import('@/lib/admin/crop-math').CropData | null;
  // Public URL of the untouched original — set by the product loader.
  // Falls back to `preview` when the image has never been cropped.
  originalUrl?: string;
  type: 'cover' | 'back' | 'spine' | 'inside' | 'toc' | 'other';
  position?: number;
  uploading?: boolean;
};

const IMAGE_TYPE_LABELS: Record<ImageItem['type'], string> = {
  cover: 'Couverture',
  back: 'Quatrième',
  spine: 'Dos',
  inside: 'Intérieur',
  toc: 'Sommaire',
  other: 'Autre',
};

const IMAGE_TYPE_OPTIONS = Object.entries(IMAGE_TYPE_LABELS) as [ImageItem['type'], string][];

// Normalise pour une comparaison tolérante (accents/casse/ponctuation) —
// utilisé uniquement pour un avertissement non-bloquant, jamais pour
// modifier automatiquement un champ.
function normalizeForCompare(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

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
  duplicateHref,
}: {
  initialData?: Partial<FormData>;
  productId?: string;
  categories?: { id: string; name: string; slug: string }[];
  duplicateHref?: string;
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
  const [savingAuthor, setSavingAuthor] = useState(false);
  const isSubmittingAuthorRef = useRef(false);
  const [showPublisherModal, setShowPublisherModal] = useState(false);
  const [newPublisherName, setNewPublisherName] = useState('');
  const [newPublisherDesc, setNewPublisherDesc] = useState('');
  const [savingPublisher, setSavingPublisher] = useState(false);
  const isSubmittingPublisherRef = useRef(false);

  const [saving, setSaving] = useState(false);
  // `saving` (React state) drives the disabled UI, but its DOM update isn't
  // guaranteed to land before a second native click fires in the same tick
  // (double-click, or a very fast repeat tap). This ref is a plain,
  // synchronous mutation checked at the very top of the handler, so two
  // overlapping submissions can never both pass the guard.
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const [biblioOpen, setBiblioOpen] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  // Repliée dès qu'une vraie photo de couverture existe — la photo réelle
  // prime sur le fallback visuel (Phase G). Réagit quand la présence d'une
  // couverture change réellement (ajout/suppression), mais ne referme pas
  // la section sous l'opérateur s'il l'a rouverte manuellement entre-temps.
  const [fallbackOpen, setFallbackOpen] = useState(
    () => !(initialData?.images || []).some((img) => img.type === 'cover')
  );
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const hasCoverImage = images.some((img) => img.type === 'cover');
  const hadCoverRef = useRef(hasCoverImage);
  useEffect(() => {
    if (hadCoverRef.current !== hasCoverImage) {
      setFallbackOpen(!hasCoverImage);
      hadCoverRef.current = hasCoverImage;
    }
  }, [hasCoverImage]);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [duplicating, setDuplicating] = useState(false);
  const isDuplicatingRef = useRef(false);

  // Read-only check first (never mutates), then an explicit confirmation
  // naming exactly what will happen — a new draft, no copied images, cover
  // required before publish — before the real POST mutation runs. The ref
  // guard stops a rapid double-click from firing two POSTs (Phase L §23).
  const handleDuplicate = async () => {
    if (!duplicateHref || isDuplicatingRef.current) return;
    isDuplicatingRef.current = true;
    setDuplicating(true);
    try {
      let similarCount = 0;
      try {
        const checkRes = await fetch(`/api/admin/products/${productId}/duplicate-check`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          similarCount = checkData.similarCount || 0;
        }
      } catch {
        // Non-bloquant : l'absence de compte ne doit pas empêcher la duplication.
      }

      const lines = [
        'Dupliquer ce livre ?',
        '',
        '- Un nouveau BROUILLON sera créé.',
        '- Les photos ne sont pas copiées : le nouveau brouillon doit recevoir sa propre couverture.',
        '- Il devra recevoir une couverture avant de pouvoir être publié.',
      ];
      if (similarCount > 0) {
        lines.push('', `${similarCount} brouillon${similarCount > 1 ? 's' : ''} similaire${similarCount > 1 ? 's' : ''} existe${similarCount > 1 ? 'nt' : ''} déjà.`);
      }
      if (!confirm(lines.join('\n'))) {
        return;
      }

      const res = await fetch(duplicateHref, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/admin/produits/${data.id}`);
      } else {
        alert(data.error || 'Erreur lors de la duplication.');
      }
    } catch {
      alert('Erreur réseau lors de la duplication.');
    } finally {
      isDuplicatingRef.current = false;
      setDuplicating(false);
    }
  };

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

  // Avertissement UNIQUEMENT — ne bloque jamais l'enregistrement/publication,
  // ne modifie jamais le titre automatiquement. Seuil de longueur pour éviter
  // un faux positif bruyant sur un nom très court/générique (ex: "Al", "Ibn").
  const MIN_ENTITY_NAME_LENGTH = 4;
  const titleQualityWarning = useMemo(() => {
    const title = normalizeForCompare(form.title);
    if (!title) return null;
    const authorNorm = normalizeForCompare(form.author);
    const publisherNorm = normalizeForCompare(form.publisher);
    if (authorNorm.length >= MIN_ENTITY_NAME_LENGTH && title.includes(authorNorm)) {
      return "Le titre semble répéter l'auteur ou l'éditeur. Vérifiez que ce champ contient uniquement le titre de l'ouvrage.";
    }
    if (publisherNorm.length >= MIN_ENTITY_NAME_LENGTH && title.includes(publisherNorm)) {
      return "Le titre semble répéter l'auteur ou l'éditeur. Vérifiez que ce champ contient uniquement le titre de l'ouvrage.";
    }
    return null;
  }, [form.title, form.author, form.publisher]);

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

    // A cropped image has TWO storage objects (the derivative in
    // storagePath, the untouched original in originalStoragePath) — both
    // must be considered for cleanup, never just the one currently shown.
    const pathsToClean = Array.from(new Set([target?.storagePath, target?.originalStoragePath].filter(Boolean))) as string[];
    if (pathsToClean.length > 0) {
      try {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: pathsToClean }),
        });
      } catch {
        // Silencieux
      }
    }
  };

  // Changer le rôle d'une image. Choisir "Couverture" rétrograde en toute
  // sécurité l'ancienne couverture (une seule couverture à la fois).
  const setImageType = (index: number, type: ImageItem['type']) => {
    setImages((prev) =>
      prev.map((img, i) => {
        if (i === index) return { ...img, type };
        if (type === 'cover' && img.type === 'cover') return { ...img, type: 'inside' };
        return img;
      })
    );
  };

  // Réordonnancement simple (échange avec le voisin) — la position persistée
  // suit directement l'ordre du tableau, pas besoin de glisser-déposer.
  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Synchronous ref guard (same pattern as the main form's isSubmittingRef)
  // — a fast double-click on "Enregistrer l'auteur" fires two native click
  // events before React's `savingAuthor` state re-render can disable the
  // button, so a plain state check alone isn't enough to stop the second
  // request. This is what let two identically-named author rows get created
  // 0.3s apart in the wild (Phase K finding).
  const handleQuickCreateAuthor = async () => {
    if (!newAuthorName.trim() || isSubmittingAuthorRef.current) return;
    isSubmittingAuthorRef.current = true;
    setSavingAuthor(true);
    try {
      const res = await fetch('/api/admin/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAuthorName, bio: newAuthorBio }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setAuthorsList((prev) => (prev.some((a) => a.id === data.id) ? prev : [...prev, { id: data.id, name: data.name }]));
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
    } finally {
      isSubmittingAuthorRef.current = false;
      setSavingAuthor(false);
    }
  };

  const handleQuickCreatePublisher = async () => {
    if (!newPublisherName.trim() || isSubmittingPublisherRef.current) return;
    isSubmittingPublisherRef.current = true;
    setSavingPublisher(true);
    try {
      const res = await fetch('/api/admin/publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPublisherName, description: newPublisherDesc }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setPublishersList((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, { id: data.id, name: data.name }]));
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
    } finally {
      isSubmittingPublisherRef.current = false;
      setSavingPublisher(false);
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

  // Soumission globale avec validation différenciée Brouillon vs Publication.
  // `addAnother` ne s'applique qu'à la création (pas de productId) : après
  // succès confirmé du serveur, le formulaire est réinitialisé pour saisir
  // le livre suivant sans revalider la page.
  const handleFormSubmit = async (
    e: React.FormEvent,
    targetStatus?: 'draft' | 'published' | 'archived',
    addAnother?: boolean
  ) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

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

      // Une couverture doit avoir type === 'cover' ET être réellement
      // uploadée (storagePath présent, pas seulement en cours d'upload) —
      // publier sans couverture réelle est bloqué, pas seulement déconseillé.
      const hasCover = images.some((img) => img.type === 'cover' && img.storagePath);
      if (!hasCover) {
        setError('Ajoutez une couverture avant de publier ce livre.');
        return;
      }

      // Marqueur interne du duplicateur ("Titre (copie)") — utile en
      // brouillon, dangereux en ligne si l'opérateur oublie de le retirer.
      if (/\(copie\)/i.test(form.title)) {
        setError('Renommez cette copie avant de la publier.');
        return;
      }
    }

    isSubmittingRef.current = true;
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
          originalStoragePath: img.originalStoragePath || null,
          cropData: img.cropData || null,
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

      // Succès confirmé par le serveur — seul point à partir duquel il est
      // sûr de réinitialiser le formulaire (jamais avant : voir critère
      // d'acceptation Phase G §35, aucune perte en cas d'échec de l'API).
      if (!productId && addAnother) {
        setForm({ ...DEFAULT_FORM });
        setVariants([]);
        setImages([]);
        setFallbackOpen(true);
        setSuccess(
          finalStatus === 'published'
            ? 'Livre publié avec succès. Vous pouvez ajouter le suivant.'
            : 'Brouillon enregistré. Vous pouvez ajouter le suivant.'
        );
        titleInputRef.current?.focus();
        return;
      }

      setSuccess(
        productId
          ? `Fiche mise à jour (${finalStatus === 'published' ? 'Publiée' : 'Brouillon'}).`
          : finalStatus === 'published'
            ? 'Livre publié avec succès.'
            : 'Brouillon enregistré.'
      );

      if (result.slug) {
        setForm((prev) => ({ ...prev, slug: result.slug }));
      }

      if (!productId && result.id) {
        router.push(`/admin/produits/${result.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError('Erreur réseau lors de la communication avec le serveur.');
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  const isCoran = form.category === 'Coran' || form.title.toLowerCase().includes('coran');
  const isUploading = images.some((img) => img.uploading);

  return (
    <div className="product-form-root">
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
            {/* Discreet technical reference — desktop only (see the mobile
                breakpoint rule hiding it). Previously this was the page's
                entire subtitle, rendered as a full-width multi-line UUID
                directly under the title on mobile; the id itself is
                unchanged in business logic, just no longer prominent UI. */}
            {productId && (
              <span
                className="product-form-id-ref"
                title={productId}
                onClick={() => navigator.clipboard?.writeText(productId)}
              >
                Réf. {productId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>

        <div className="form-actions-buttons">
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

          {duplicateHref && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDuplicate} disabled={duplicating}>
              <Copy size={14} />
              <span>{duplicating ? 'Duplication…' : 'Dupliquer'}</span>
            </button>
          )}

          {/* Secondaire : reprendre une saisie rapide sans repasser par
              la liste — hiérarchie : action tertiaire (voir), action
              secondaire (ajouter suivant), action(s) primaire(s). */}
          {productId && (
            <Link href="/admin/produits/nouveau" className="btn btn-secondary btn-sm">
              <Plus size={14} />
              <span>Ajouter un autre livre</span>
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

          {!productId && (
            <button
              type="button"
              className="btn btn-gold"
              disabled={saving || isUploading}
              onClick={(e) => handleFormSubmit(e as any, 'published', true)}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
              <span>{isUploading ? 'Upload en cours...' : 'Publier et ajouter un autre'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Phone: the top bar above only shows identity (back-link, title,
          status) via CSS at this breakpoint — the actions themselves move
          to a real bottom sticky bar instead of clipping/overflowing a
          horizontal toolbar. Same buttons, same handlers, just relocated;
          this is the only reason they're rendered a second time. */}
      <div className="form-actions-mobile-bar">
        <div className="form-actions-mobile-primary">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving || isUploading}
            onClick={(e) => handleFormSubmit(e as any, 'draft')}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            <span>{isUploading ? 'Upload...' : 'Brouillon'}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || isUploading}
            onClick={(e) => handleFormSubmit(e as any, 'published')}
          >
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            <span>{isUploading ? 'Upload...' : (productId ? 'Publier' : 'Publier le livre')}</span>
          </button>
        </div>
        <div className="form-actions-mobile-secondary">
          {!productId && (
            <button
              type="button"
              className="btn btn-gold btn-sm"
              disabled={saving || isUploading}
              onClick={(e) => handleFormSubmit(e as any, 'published', true)}
            >
              <Plus size={13} />
              <span>Publier et ajouter un autre</span>
            </button>
          )}
          {productId && form.status === 'published' && form.slug && (
            <Link href={`/livres/${form.slug}`} target="_blank" className="btn btn-secondary btn-sm">
              <Eye size={13} />
              <span>Voir sur le site</span>
            </Link>
          )}
          {duplicateHref && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleDuplicate} disabled={duplicating}>
              <Copy size={13} />
              <span>{duplicating ? 'Duplication…' : 'Dupliquer'}</span>
            </button>
          )}
          {productId && (
            <Link href="/admin/produits/nouveau" className="btn btn-secondary btn-sm">
              <Plus size={13} />
              <span>Ajouter un autre</span>
            </Link>
          )}
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
                ref={titleInputRef}
                id="title"
                type="text"
                className="form-input"
                placeholder="Ex: Le Jardin des Vertueux (Riyad as-Salihin)"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                required
              />
              <span className="field-hint">
                Saisissez uniquement le titre de l&apos;ouvrage. L&apos;auteur, l&apos;éditeur et les autres informations disposent de champs dédiés.
              </span>
              {titleQualityWarning && (
                <span className="field-warning">
                  <AlertCircle size={13} />
                  <span>{titleQualityWarning}</span>
                </span>
              )}
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
                placeholder="Présentation factuelle de l'ouvrage, contenu, thèmes abordés..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
              <span className="field-hint">
                Utilisez uniquement une description vérifiée provenant du livre, de l&apos;éditeur ou d&apos;une source fiable. Évitez les affirmations non sourcées sur l&apos;auteur ou les qualités de l&apos;ouvrage.
              </span>
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
                      <div className="image-preview-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.preview} alt={`Aperçu ${i + 1}`} />
                        {img.type === 'cover' && (
                          <span className="image-preview-cover-badge" title="Couverture actuelle">★</span>
                        )}
                        <button
                          type="button"
                          className="image-preview-remove"
                          onClick={() => removeImage(i)}
                          title="Supprimer la photo"
                          aria-label={`Supprimer la photo ${i + 1}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="image-preview-controls">
                        <select
                          className="image-preview-role-select"
                          value={img.type}
                          onChange={(e) => setImageType(i, e.target.value as ImageItem['type'])}
                          aria-label={`Rôle de la photo ${i + 1}`}
                        >
                          {IMAGE_TYPE_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <div className="image-preview-move">
                          <button
                            type="button"
                            onClick={() => moveImage(i, -1)}
                            disabled={i === 0}
                            title="Déplacer vers la gauche"
                            aria-label={`Déplacer la photo ${i + 1} vers la gauche`}
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(i, 1)}
                            disabled={i === images.length - 1}
                            title="Déplacer vers la droite"
                            aria-label={`Déplacer la photo ${i + 1} vers la droite`}
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                      {img.type === 'cover' && img.storagePath && !img.uploading && productId && img.id && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm image-preview-crop-btn"
                          onClick={() => setCropIndex(i)}
                        >
                          Ajuster la couverture
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fallback 3D — secondaire dès qu'une vraie photo existe (Phase G) */}
            <div className="form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--admin-border)' }}>
              <button
                type="button"
                className="form-disclosure-toggle"
                onClick={() => setFallbackOpen((o) => !o)}
                aria-expanded={fallbackOpen}
              >
                <span>Fallback si aucune photo n&apos;est disponible</span>
                {fallbackOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <span className="field-hint">
                Couverture 3D générée à partir d&apos;une couleur — utilisée uniquement si aucune vraie photo de couverture n&apos;est fournie.
              </span>
              {fallbackOpen && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
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
              )}
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
                    <label className="form-label" htmlFor="isbn">ISBN / Code EAN <span className="form-label-optional">facultatif</span></label>
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
                    <label className="form-label" htmlFor="pages">Nombre de pages <span className="form-label-optional">facultatif</span></label>
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
                    <label className="form-label" htmlFor="year">Année de publication <span className="form-label-optional">facultatif</span></label>
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
                    <label className="form-label" htmlFor="dimensions">Dimensions (Format) <span className="form-label-optional">facultatif</span></label>
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
                    <label className="form-label" htmlFor="binding">Type de reliure <span className="form-label-optional">facultatif</span></label>
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
                      Poids de l&apos;ouvrage <span className="form-label-optional">facultatif — grammes</span>
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
                      Facultatif. Cette information n&apos;est pas nécessaire pour publier ou commander un livre — conservée pour de futurs besoins logistiques.
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
              <label className="form-label" htmlFor="themes">Mots-clés / Thèmes <span className="form-label-optional">facultatif</span></label>
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
      <AdminModal open={showAuthorModal} onClose={() => setShowAuthorModal(false)} title="Créer un nouvel auteur">
        <div className="form-group">
          <label className="form-label">Nom de l&apos;auteur *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Cheikh Ibn Baz"
            value={newAuthorName}
            onChange={(e) => setNewAuthorName(e.target.value)}
            data-autofocus
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
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAuthorModal(false)} disabled={savingAuthor}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleQuickCreateAuthor} disabled={savingAuthor || !newAuthorName.trim()}>
            {savingAuthor ? 'Enregistrement…' : "Enregistrer l'auteur"}
          </button>
        </div>
      </AdminModal>

      {/* Modal Éditeur */}
      <AdminModal open={showPublisherModal} onClose={() => setShowPublisherModal(false)} title="Créer un éditeur">
        <div className="form-group">
          <label className="form-label">Nom de la maison d&apos;édition *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Éditions Darussalam"
            value={newPublisherName}
            onChange={(e) => setNewPublisherName(e.target.value)}
            data-autofocus
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
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPublisherModal(false)} disabled={savingPublisher}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleQuickCreatePublisher} disabled={savingPublisher || !newPublisherName.trim()}>
            {savingPublisher ? 'Enregistrement…' : "Enregistrer l'éditeur"}
          </button>
        </div>
      </AdminModal>

      {/* Éditeur de recadrage — ne peut opérer que sur une image déjà
          persistée (id + productId réels) car il écrit directement sur la
          ligne product_images correspondante. */}
      {cropIndex !== null && productId && images[cropIndex]?.id && (
        <CoverCropModal
          open={cropIndex !== null}
          onClose={() => setCropIndex(null)}
          productId={productId}
          imageId={images[cropIndex].id!}
          originalUrl={images[cropIndex].originalUrl || images[cropIndex].preview}
          existingCropData={images[cropIndex].cropData || null}
          productTitle={form.title}
          productAuthor={form.author}
          color={form.color}
          ink="#f7e6c4"
          onApplied={(result) => {
            setImages((prev) =>
              prev.map((img, i) =>
                i === cropIndex
                  ? {
                      ...img,
                      storagePath: result.storagePath,
                      originalStoragePath: result.originalStoragePath,
                      cropData: result.cropData,
                      preview: result.publicUrl,
                    }
                  : img
              )
            );
          }}
          onReset={(result) => {
            setImages((prev) =>
              prev.map((img, i) =>
                i === cropIndex
                  ? {
                      ...img,
                      storagePath: result.storagePath,
                      originalStoragePath: result.originalStoragePath,
                      cropData: null,
                      preview: result.publicUrl,
                    }
                  : img
              )
            );
          }}
        />
      )}
    </div>
  );
}
