import { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/lib/data/products';
import { BookCard } from '@/components/books/book-card';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const pubName = params.slug.replace(/-/g, ' ');
  const title = `${pubName.charAt(0).toUpperCase() + pubName.slice(1)} — Librairie Al Furqan`;
  return {
    title,
    description: `Parcourez les publications de la maison d'édition ${pubName} à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/editeurs/${params.slug}`,
    },
  };
}

async function PublisherProductsList({ publisherSlug }: { publisherSlug: string }) {
  const allProducts = await getProducts({ status: 'published' });
  const products = allProducts.filter((p) => {
    const slugifiedPub = p.publisher ? p.publisher.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    return slugifiedPub === publisherSlug || (p.publisher && p.publisher.toLowerCase().includes(publisherSlug.replace(/-/g, ' ')));
  });

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFF', borderRadius: 12, border: '1px solid var(--line)', marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucun ouvrage répertorié pour cette maison d&apos;édition</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
          Les éditions de cette maison seront progressivement ajoutées au catalogue en ligne. Vous pouvez nous faire une demande directe par WhatsApp.
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

export default function PublisherPage({ params }: { params: { slug: string } }) {
  const pubName = params.slug.replace(/-/g, ' ');
  const formattedTitle = pubName.charAt(0).toUpperCase() + pubName.slice(1);

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--muted)' }}>Éditeurs</span> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formattedTitle}</span>
      </nav>

      <header style={{ marginBottom: 32 }}>
        <span className="eyebrow">Maison d&apos;Édition</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          {formattedTitle}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 600 }}>
          Publications éditoriales diffusées par la Librairie Al Furqan.
        </p>
      </header>

      <Suspense fallback={<CatalogGridSkeleton count={6} />}>
        <PublisherProductsList publisherSlug={params.slug} />
      </Suspense>
    </main>
  );
}
