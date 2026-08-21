import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthorBySlug } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { BookCard } from '@/components/books/book-card';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  if (!author) return {};

  return {
    title: `${author.name} — Librairie Al Furqan`,
    description: author.bio || `Découvrez tous les ouvrages de ${author.name} disponibles à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/auteurs/${author.slug}`,
    },
  };
}

async function AuthorProductsList({ authorSlug }: { authorSlug: string }) {
  const products = await getProducts({ author: authorSlug, status: 'published' });

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucun ouvrage répertorié pour cet auteur</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
          Les œuvres de cet auteur seront progressivement ajoutées au catalogue en ligne.
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

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const author = await getAuthorBySlug(params.slug);

  if (!author) {
    notFound();
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--muted)' }}>Auteurs</span> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{author.name}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <span className="eyebrow">Auteur</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          {author.name}
        </h1>
        {author.bio && (
          <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
            {author.bio}
          </p>
        )}
      </header>

      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <AuthorProductsList authorSlug={params.slug} />
      </Suspense>
    </main>
  );
}
