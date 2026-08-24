import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/al-furqan-data';
import { getProducts } from '@/lib/data/products';
import { getCategories } from '@/lib/data/categories';
import { getCollections } from '@/lib/data/collections';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const [products, collections, categories] = await Promise.all([
    getProducts({ status: 'published', limit: 5000 }),
    getCollections(),
    getCategories(),
  ]);

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/livres/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((cat) => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const collectionUrls = collections.map((collection) => ({
    url: `${baseUrl}/collections/${collection.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Unique authors and publishers using direct relation slugs
  const authorSlugs = Array.from(
    new Set(products.map((p) => p.authorSlug).filter(Boolean) as string[])
  );

  const publisherSlugs = Array.from(
    new Set(products.map((p) => p.publisherSlug).filter(Boolean) as string[])
  );

  const authorUrls = authorSlugs.map((slug) => ({
    url: `${baseUrl}/auteurs/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const publisherUrls = publisherSlugs.map((slug) => ({
    url: `${baseUrl}/editeurs/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // /livraison is intentionally `robots: { index: false }` (see
  // app/livraison/layout.tsx) — a sitemap should only list pages meant to
  // be indexed, so it's excluded here rather than sending crawlers a
  // contradictory signal.
  const staticUrls = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/catalogue`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/collections`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/a-propos`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  return [...staticUrls, ...categoryUrls, ...collectionUrls, ...authorUrls, ...publisherUrls, ...productUrls];
}
