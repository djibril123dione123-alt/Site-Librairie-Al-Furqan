import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/al-furqan-data';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

  if (!allowIndexing) {
    // Désindexation globale tant que le vrai catalogue n'est pas prêt
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/panier', '/selection', '/admin'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
