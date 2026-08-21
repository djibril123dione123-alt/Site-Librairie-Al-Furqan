import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducts } from '@/lib/data/products';
import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import { BookCard } from '@/components/books/book-card';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const categoryName = params.slug.replace(/-/g, ' ');
  const title = `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} — Librairie Al Furqan`;
  return {
    title,
    description: `Découvrez la sélection d'ouvrages de la catégorie ${categoryName} chez la Librairie Al Furqan à Saint-Louis, Sénégal.`,
    alternates: {
      canonical: `/categories/${params.slug}`,
    },
  };
}

async function CategoryProductsList({ categorySlug }: { categorySlug: string }) {
  const products = await getProducts({ category: categorySlug, status: 'published' });

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: 12, border: '1px solid var(--line)', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucun ouvrage dans cette catégorie pour le moment</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
          Les ouvrages de cette section seront bientôt disponibles en ligne. Vous pouvez nous faire une demande directe par WhatsApp.
        </p>
        <Link href="/catalogue" className="button button-dark">
          Explorer tout le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginTop: 24 }}>
      {products.map((product) => (
        <BookCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const categoryName = params.slug.replace(/-/g, ' ');
  const formattedTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://alfurqan.sn' },
      { '@type': 'ListItem', position: 2, name: 'Catégories', item: 'https://alfurqan.sn/catalogue' },
      { '@type': 'ListItem', position: 3, name: formattedTitle, item: `https://alfurqan.sn/categories/${params.slug}` },
    ],
  };

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <Link href="/catalogue" style={{ color: 'var(--muted)' }}>Catégories</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formattedTitle}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <span className="eyebrow">Rayon Éditorial</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          {formattedTitle}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
          Ouvrages sélectionnés dans le rayon {formattedTitle} par la Librairie Al Furqan.
        </p>
      </header>

      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <CategoryProductsList categorySlug={params.slug} />
      </Suspense>
    </main>
  );
}
