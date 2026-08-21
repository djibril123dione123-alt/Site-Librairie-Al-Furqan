import type { Product } from '@/lib/types/ui';

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

export const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} F CFA`;

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function generateOrderRef(): string {
  return `AF-${Math.floor(1000 + Math.random() * 8999)}`;
}

export function getRecentlyViewed(productsList: Product[]): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('af-recent');
    if (!stored) return [];
    const ids: string[] = JSON.parse(stored);
    return ids.map((id) => productsList.find((p) => p.id === id)).filter((p): p is Product => Boolean(p)).slice(0, 6);
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
