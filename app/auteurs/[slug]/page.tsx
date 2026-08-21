import { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/lib/data/products';
import { BookCard } from '@/components/books/book-card';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const authorName = params.slug.replace(/-/g, ' ');
  const title = `${authorName.charAt(0).toUpperCase() + authorName.slice(1)} — Librairie Al Furqan`;
  return {
    title,
    description: `Découvrez tous les ouvrages de ${authorName} disponibles à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/auteurs/${params.slug}`,
    },
  };
}

async function AuthorProductsList({ authorSlug }: { authorSlug: string }) {
  const allProducts = await getProducts({ status: 'published' });
  const products = allProducts.filter((p) => {
    const slugifiedAuthor = p.author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return slugifiedAuthor === authorSlug || p.author.toLowerCase().includes(authorSlug.replace(/-/g, ' '));
  });

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: 12, border: '1px solid var(--line)', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucun ouvrage répertorié pour cet auteur</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
          Les œuvres de cet auteur seront progressivement ajoutées au catalogue en ligne. Vous pouvez nous faire une demande directe par WhatsApp.
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

export default function AuthorPage({ params }: { params: { slug: string } }) {
  const authorName = params.slug.replace(/-/g, ' ');
  const formattedTitle = authorName.charAt(0).toUpperCase() + authorName.slice(1);

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--muted)' }}>Auteurs</span> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formattedTitle}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <span className="eyebrow">Auteur & Érudit</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          {formattedTitle}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
          Ouvrages et écrits de {formattedTitle} distribués par la Librairie Al Furqan.
        </p>
      </header>

      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <AuthorProductsList authorSlug={params.slug} />
      </Suspense>
    </main>
  );
}
