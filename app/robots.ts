import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/panier', '/selection'] }, sitemap: 'https://alfurqan-demo.vercel.app/sitemap.xml' };
}
