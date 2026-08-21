import type { MetadataRoute } from 'next';
import { collections, products, siteConfig } from '@/lib/al-furqan-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://alfurqan-demo.vercel.app';
  const staticPages = [
    { url: '/', priority: 1, changeFrequency: 'weekly' as const },
    { url: '/catalogue', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/livraison', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/a-propos', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
  ];
  const productPages = products.map((p) => ({ url: `/livres/${p.slug}`, priority: 0.7, changeFrequency: 'weekly' as const }));
  const collectionPages = collections.map((c) => ({ url: `/collections/${c.slug}`, priority: 0.6, changeFrequency: 'monthly' as const }));
  return [...staticPages, ...productPages, ...collectionPages].map((page) => ({ url: `${base}${page.url}`, lastModified: new Date(), changeFrequency: page.changeFrequency, priority: page.priority }));
}
