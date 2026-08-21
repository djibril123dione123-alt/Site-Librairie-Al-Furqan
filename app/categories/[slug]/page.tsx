import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCategoryBySlug } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { BookCard } from '@/components/books/book-card';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};

  return {
    title: `${category.name} — Librairie Al Furqan`,
    description: category.description || `Découvrez nos livres de la catégorie ${category.name} à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
  };
}

async function CategoryProductsList({ categorySlug }: { categorySlug: string }) {
  const products = await getProducts({ category: categorySlug, status: 'published' });

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: 12, border: '1px solid var(--line)', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucun ouvrage pour le moment dans cette catégorie</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
          Les ouvrages de cette catégorie seront progressivement ajoutés au catalogue.
        </p>
        <Link href="/catalogue" className="button button-dark">
          Voir tout le catalogue
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

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);

  if (!category) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <Link href="/catalogue" style={{ color: 'var(--muted)' }}>Catégories</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{category.name}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <span className="eyebrow">Rayon Éditorial</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          {category.name}
        </h1>
        {category.description && (
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
            {category.description}
          </p>
        )}
      </header>

      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <CategoryProductsList categorySlug={params.slug} />
      </Suspense>
    </main>
  );
}
