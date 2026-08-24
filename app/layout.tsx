import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import { siteConfig, getSiteUrl } from '@/lib/al-furqan-data';
import { StoreProvider } from '@/components/providers';
import { CustomerSessionProvider } from '@/components/auth/customer-session-provider';
import { StorefrontLayout } from '@/components/layout/storefront-layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.brand} — Livres pour apprendre, comprendre et transmettre`,
    template: `%s | ${siteConfig.brand}`,
  },
  description: siteConfig.description,
  keywords: ['librairie islamique', 'Coran', 'Tafsir', 'Saint-Louis', 'Sénégal', 'Al Furqan', 'livres islamiques', 'arabe', 'spiritualité'],
  authors: [{ name: siteConfig.brand }],
  creator: siteConfig.brand,
  metadataBase: new URL(getSiteUrl()),
  alternates: { canonical: '/' },
  openGraph: {
    title: siteConfig.brand,
    description: siteConfig.description,
    type: 'website',
    locale: 'fr_SN',
    siteName: siteConfig.brand,
    url: getSiteUrl(),
  },
  twitter: { card: 'summary_large_image', title: siteConfig.brand, description: siteConfig.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  themeColor: '#091e24', // matches canonical --deep token (app/globals.css)
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "BookStore",
    "name": siteConfig.brand,
    "description": siteConfig.description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Saint-Louis",
      "addressCountry": "SN"
    },
    "sameAs": [siteConfig.tiktok, siteConfig.facebook]
  };

  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      </head>
      <body>
        <CustomerSessionProvider>
          <StoreProvider>
            <StorefrontLayout>
              {children}
            </StorefrontLayout>
          </StoreProvider>
        </CustomerSessionProvider>
      </body>
    </html>
  );
}
