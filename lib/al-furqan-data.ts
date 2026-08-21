// TEMPORARY SEED DATA / À REMPLACER AVANT MISE EN PRODUCTION.
// Les données ci-dessous contiennent des claims générés et non confirmés commercialement.

export type Availability = 'Disponible' | 'Derniers exemplaires' | 'De retour en stock' | 'Indisponible temporairement';

export type VariantAttribute = { label: string; value: string };

export type Variant = {
  id: string;
  attributes: VariantAttribute[];
  price: number;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  themes: string[];
  language: string;
  publisher: string;
  price: number;
  availability: Availability;
  featured?: boolean;
  newArrival?: boolean;
  restocked?: boolean;
  reading?: 'Hafs' | 'Warsh';
  tajwid?: boolean;
  aliases: string[];
  description: string;
  format?: string;
  isbn?: string;
  pages?: number;
  dimensions?: string;
  binding?: string;
  edition?: string;
  year?: number;
  audience?: string;
  variants?: Variant[];
  color: string;
  ink: string;
};

export type Collection = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  productIds: string[];
};

export type DeliveryOption = { name: string; description: string };

export const siteConfig = {
  brand: 'Librairie Al Furqan',
  shortBrand: 'Al Furqan',
  tagline: 'Librairie islamique',
  description: 'Librairie islamique à Saint-Louis, Sénégal. Corans, tafsirs, ouvrages de croyance, spiritualité, éducation, langue arabe.',
  whatsapp: '221777008562',
  phoneDisplay: '+221 77 700 85 62',
  location: 'Saint-Louis, Sénégal',
  tiktok: 'https://www.tiktok.com/@alfurqan.librairie',
  facebook: 'https://www.facebook.com/marketplace/profile/100011780529274/',
  currency: 'XOF',
  deliveryOptions: [
    { name: 'La Poste', description: 'Mode de livraison observé.' },
    { name: 'Dem Dikk', description: 'Mode de livraison observé.' },
    { name: 'Tiak Tiak', description: 'Mode de livraison observé.' },
  ] as DeliveryOption[],
};

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export const categories = ['Coran', 'Tafsir', 'Invocations & Dhikr', 'Croyance & Foi', 'Spiritualité', 'Mariage', 'Femme', 'Jeunesse', 'Récits', 'Éducation', 'Arabe', 'Packs'];

export const products: Product[] = [
  { id: 'coran-warsh', slug: 'coran-tajwid-warsh-moyen', title: 'Coran Tajwid — Lecture Warsh', author: 'Al Madina', category: 'Coran', themes: ['Tajwid', 'Warsh', 'Coran'], language: 'Arabe', publisher: 'Éditions Al Madina', price: 12500, availability: 'Disponible', featured: true, aliases: ['quran', "qur'an", 'warch', 'warsh'], description: 'Un Coran soigneusement composé pour accompagner la lecture et la mémorisation, avec repères de tajwid.', reading: 'Warsh', tajwid: true, format: 'Moyen', color: 'navy', ink: '#f7e6c4', variants: [{ id: 'warsh-bleu-moyen', attributes: [{ label: 'Lecture', value: 'Warsh' }, { label: 'Format', value: 'Moyen' }, { label: 'Couleur', value: 'Bleu' }], price: 12500, stock: 8 }, { id: 'warsh-noir-grand', attributes: [{ label: 'Lecture', value: 'Warsh' }, { label: 'Format', value: 'Grand' }, { label: 'Couleur', value: 'Noir' }], price: 15000, stock: 3 }] },
  { id: 'coran-hafs', slug: 'coran-tajwid-hafs-bleu', title: 'Coran Tajwid — Lecture Hafs', author: 'Al Madina', category: 'Coran', themes: ['Tajwid', 'Hafs', 'Coran'], language: 'Arabe', publisher: 'Éditions Al Madina', price: 11500, availability: 'Disponible', featured: true, aliases: ['quran', "qur'an", 'hafs'], description: 'Une édition claire avec codes couleur et repères de lecture pour progresser à son rythme.', reading: 'Hafs', tajwid: true, format: 'Moyen', color: 'sand', ink: '#164153', variants: [{ id: 'hafs-bleu-moyen', attributes: [{ label: 'Lecture', value: 'Hafs' }, { label: 'Format', value: 'Moyen' }, { label: 'Couleur', value: 'Bleu' }], price: 11500, stock: 12 }, { id: 'hafs-rose-moyen', attributes: [{ label: 'Lecture', value: 'Hafs' }, { label: 'Format', value: 'Moyen' }, { label: 'Couleur', value: 'Rose' }], price: 11500, stock: 4 }] },
  { id: 'tafsir-ibn-kathir', slug: 'tafsir-ibn-kathir-abrege', title: 'Tafsir Ibn Kathir — Abrégé', author: 'Ibn Kathir', category: 'Tafsir', themes: ['Tafsir', 'Coran', 'Compréhension'], language: 'Français', publisher: 'Dar Ibn Al-Jawzi', price: 18500, availability: 'Disponible', newArrival: true, aliases: ['ibn kathîr', 'ibn kathir', 'tafsir'], description: 'Une porte d’entrée structurée pour approfondir le sens des versets et leur contexte.', color: 'terracotta', ink: '#fffaf0' },
  { id: 'paraboles-coran', slug: 'les-paraboles-du-coran', title: 'Les paraboles du Coran', author: 'Abd ar-Rahman as-Saadi', category: 'Spiritualité', themes: ['Coran', 'Réflexion'], language: 'Français', publisher: 'Éditions Al Furqan', price: 7500, availability: 'De retour en stock', featured: true, restocked: true, aliases: ['parabole', 'coran'], description: 'Une lecture accessible pour méditer les images et enseignements des paraboles coraniques.', color: 'ochre', ink: '#fff8e8' },
  { id: 'hisn-muslim', slug: 'la-citadelle-du-musulman', title: 'La Citadelle du Musulman', author: 'Saïd al-Qahtani', category: 'Invocations & Dhikr', themes: ['Dhikr', 'Invocations'], language: 'Français / Arabe', publisher: 'Dar Al Muslim', price: 4500, availability: 'Disponible', newArrival: true, aliases: ['hisn muslim', 'zikr', 'dhikr'], description: 'Le recueil essentiel des invocations du quotidien, en arabe accompagné de sa traduction.', color: 'sage', ink: '#fdf9ed' },
  { id: 'aqida-wassitiyya', slug: 'la-wassitiyya', title: 'La Foi authentique — Al-Wassitiyya', author: 'Ibn Taymiyya', category: 'Croyance & Foi', themes: ['Croyance', 'Aqida'], language: 'Français', publisher: 'Dar Al Muslim', price: 6000, availability: 'Disponible', aliases: ['aqida', 'aqidah', 'aqîda', 'croyance'], description: 'Un texte de référence présenté dans une édition simple et accessible.', color: 'slate', ink: '#f5e7c9' },
  { id: 'education-enfants', slug: 'mon-premier-livre-de-prieres', title: 'Mon premier livre de prières', author: 'Collectif', category: 'Jeunesse', themes: ['Enfants', 'Éducation'], language: 'Français', publisher: 'Al Furqan Jeunesse', price: 5500, availability: 'Derniers exemplaires', featured: true, aliases: ['enfant', 'jeunesse'], description: 'Un support illustré pour découvrir les gestes et les mots de la prière avec douceur.', color: 'sky', ink: '#153e50' },
  { id: 'arabe-debutants', slug: 'larabe-pour-les-debutants', title: "L'arabe pour les débutants", author: 'M. Al-Harbi', category: 'Arabe', themes: ['Arabe', 'Apprentissage'], language: 'Français / Arabe', publisher: 'Éditions Al Furqan', price: 9500, availability: 'Disponible', newArrival: true, aliases: ['arabe', 'apprendre arabe'], description: 'Une méthode progressive pour poser les bases de la lecture et du vocabulaire arabe.', color: 'blue', ink: '#fff9eb' },
  { id: 'histoires-prophetes', slug: 'histoires-des-prophetes', title: 'Histoires des Prophètes', author: 'Ibn Kathir', category: 'Récits', themes: ['Récits', 'Jeunesse'], language: 'Français', publisher: 'Dar Ibn Al-Jawzi', price: 8000, availability: 'Disponible', aliases: ['ibn kathir', 'prophètes'], description: 'Des récits transmis dans une édition agréable à lire et à partager en famille.', color: 'plum', ink: '#fff4df' },
  { id: 'mariage-serein', slug: 'un-mariage-serein', title: 'Pour un mariage serein', author: 'Abd ar-Razzaq al-Badr', category: 'Mariage', themes: ['Mariage', 'Famille'], language: 'Français', publisher: 'Éditions Al Furqan', price: 6500, availability: 'Disponible', aliases: ['mariage'], description: 'Des repères simples pour préparer la vie conjugale avec responsabilité et bienveillance.', color: 'rose', ink: '#563244' },
  { id: 'pack-comprendre-coran', slug: 'pack-comprendre-le-coran', title: 'Pack — Comprendre le Coran', author: 'Sélection Al Furqan', category: 'Packs', themes: ['Coran', 'Tafsir'], language: 'Français', publisher: 'Sélection Al Furqan', price: 29500, availability: 'Disponible', featured: true, aliases: ['pack', 'coran'], description: 'Une sélection de trois ouvrages pour commencer à lire, comprendre et approfondir.', color: 'ink', ink: '#f5e7c9' },
  { id: 'femme-musulmane', slug: 'la-femme-musulmane', title: 'La femme musulmane', author: 'Collectif', category: 'Femme', themes: ['Femme', 'Spiritualité'], language: 'Français', publisher: 'Dar Al Muslim', price: 7000, availability: 'Indisponible temporairement', aliases: ['femme'], description: 'Un ouvrage de lecture et de réflexion autour des grandes étapes de la vie.', color: 'lavender', ink: '#244b50' },
];

export const collections: Collection[] = [
  { slug: 'mieux-comprendre-le-coran', title: 'Pour mieux comprendre le Coran', eyebrow: 'Sélection éditoriale', description: 'Des ouvrages pour passer de la lecture à la compréhension, à votre rythme.', productIds: ['tafsir-ibn-kathir', 'paraboles-coran', 'coran-warsh'] },
  { slug: 'apprendre-arabe', title: "Commencer l'apprentissage de l'arabe", eyebrow: 'Parcours de lecture', description: 'Les premières ressources pour apprendre à lire et progresser avec confiance.', productIds: ['arabe-debutants', 'coran-hafs', 'education-enfants'] },
  { slug: 'autour-du-mariage', title: 'Autour du mariage', eyebrow: 'Choix de libraire', description: 'Des lectures à offrir, à préparer et à garder près de soi.', productIds: ['mariage-serein', 'femme-musulmane', 'hisn-muslim'] },
];

export const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} F CFA`;

export const findProduct = (slug: string) => products.find((product) => product.slug === slug);

export const findCollection = (slug: string) => collections.find((collection) => collection.slug === slug);

const aliasMap: Record<string, string> = {
  'quran': 'coran', "qur'an": 'coran', 'koran': 'coran',
  'warch': 'warsh', 'varch': 'warsh',
  'aqidah': 'aqida', 'aqîda': 'aqida', 'croyance': 'aqida',
  'zikr': 'dhikr',
  'ibn kathîr': 'ibn kathir', 'ibn al-qayyim': 'ibn qayyim',
};

export function normalizeQuery(input: string): string {
  let s = input.toLowerCase().trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[''`’]/g, "'");
  s = s.replace(/[^\w\s'-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function searchProducts(query: string): Product[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return products;
  const aliasExpanded = aliasMap[normalized] ? `${normalized} ${aliasMap[normalized]}` : normalized;
  const terms = aliasExpanded.split(' ').filter(Boolean);
  return products.filter((product) => {
    const haystack = normalizeQuery(`${product.title} ${product.author} ${product.category} ${product.themes.join(' ')} ${product.language} ${product.publisher} ${product.aliases.join(' ')}`);
    return terms.every((term) => haystack.includes(term));
  });
}

export function getAutocompleteSuggestions(query: string) {
  const normalized = normalizeQuery(query);
  if (!normalized) return { products: [], authors: [], themes: [] };
  const matched = searchProducts(query).slice(0, 5);
  const authorSet = new Set<string>();
  const themeSet = new Set<string>();
  matched.forEach((product) => {
    if (normalizeQuery(product.author).includes(normalized)) authorSet.add(product.author);
    product.themes.forEach((theme) => { if (normalizeQuery(theme).includes(normalized)) themeSet.add(theme); });
  });
  return { products: matched, authors: Array.from(authorSet).slice(0, 3), themes: Array.from(themeSet).slice(0, 3) };
}

export function getRelatedProducts(product: Product, limit = 3): Product[] {
  return products.filter((p) => p.id !== product.id && (p.category === product.category || p.themes.some((theme) => product.themes.includes(theme)))).slice(0, limit);
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function generateOrderRef(): string {
  return `AF-${Math.floor(1000 + Math.random() * 8999)}`;
}

export function getRecentlyViewed(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('af-recent');
    if (!stored) return [];
    const ids: string[] = JSON.parse(stored);
    return ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p)).slice(0, 6);
  } catch {
    return [];
  }
}

export function addRecentlyViewed(productId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem('af-recent');
    const ids: string[] = stored ? JSON.parse(stored) : [];
    const filtered = ids.filter((id) => id !== productId);
    filtered.unshift(productId);
    window.localStorage.setItem('af-recent', JSON.stringify(filtered.slice(0, 6)));
  } catch { /* ignore */ }
}
