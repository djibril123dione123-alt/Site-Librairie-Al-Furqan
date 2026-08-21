/**
 * Types UI — ce que consomment les composants React.
 * Découplés des structures SQL pour permettre des changements de BDD sans impact front.
 */

export type Availability =
  | 'Disponible'
  | 'Derniers exemplaires'
  | 'De retour en stock'
  | 'Indisponible temporairement';

export type VariantAttribute = { label: string; value: string };

export type Variant = {
  id: string;
  attributes: VariantAttribute[];
  price: number;
  stock: number;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  type: 'cover' | 'back' | 'spine' | 'inside' | 'toc' | 'other';
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  authorId?: string;
  publisher: string;
  publisherId?: string;
  category: string;
  categoryId?: string;
  themes: string[];
  language: string;
  price: number;
  availability: Availability;
  stockQuantity?: number;
  featured?: boolean;
  newArrival?: boolean;
  restocked?: boolean;
  reading?: 'Hafs' | 'Warsh';
  tajwid?: boolean;
  aliases: string[];
  description: string;
  shortDescription?: string;
  format?: string;
  isbn?: string;
  pages?: number;
  dimensions?: string;
  binding?: string;
  edition?: string;
  year?: number;
  audience?: string;
  variants?: Variant[];
  images?: ProductImage[];
  coverUrl?: string | null;
  // Couleurs pour le composant Cover (tant qu'il n'y a pas de vraies photos)
  color: string;
  ink: string;
};

export type Collection = {
  id?: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  productIds: string[];
  products?: Product[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  position: number;
  isVisible: boolean;
};

export type Author = {
  id: string;
  name: string;
  slug: string;
  bio?: string;
};

export type Publisher = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type DeliveryOption = {
  name: string;
  description: string;
};

export type SearchSuggestions = {
  products: Product[];
  authors: string[];
  themes: string[];
};
