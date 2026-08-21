import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublisherBySlug } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { BookCard } from '@/components/books/book-card';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const publisher = await getPublisherBySlug(params.slug);
  if (!publisher) return {};

  return {
    title: `${publisher.name} — Librairie Al Furqan`,
    description: publisher.description || `Parcourez les publications de la maison d'édition ${publisher.name} à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/editeurs/${publisher.slug}`,
    },
  };
}

async function PublisherProductsList({ publisherSlug }: { publisherSlug: string }) {
  const products = await getProducts({ publisher: publisherSlug, status: 'published' });

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: 12, border: '1px solid var(--line)', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucun ouvrage répertorié pour cette maison d&apos;édition</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
          Les éditions de cette maison seront progressivement ajoutées au catalogue en ligne.
        </p>
        <Link href="/catalogue" className="button button-dark">
          Voir tous les livres
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

export default async function PublisherPage({ params }: { params: { slug: string } }) {
  const publisher = await getPublisherBySlug(params.slug);

  if (!publisher) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--muted)' }}>Éditeurs</span> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{publisher.name}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <span className="eyebrow">Maison d&apos;Édition</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          {publisher.name}
        </h1>
        {publisher.description && (
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
            {publisher.description}
          </p>
        )}
      </header>

      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <PublisherProductsList publisherSlug={params.slug} />
      </Suspense>
    </main>
  );
}
