import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getSiteUrl } from '@/lib/al-furqan-data';
import { getCollectionBySlug } from '@/lib/data/collections';
import { getProducts } from '@/lib/data/products';
import { Cover } from '@/components/books/cover';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) return {};

  return {
    title: `${collection.title} — Librairie Al Furqan`,
    description: collection.description,
    alternates: {
      canonical: `/collections/${collection.slug}`,
    },
    openGraph: {
      title: collection.title,
      description: collection.description,
      url: `${getSiteUrl()}/collections/${collection.slug}`,
    },
  };
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await getCollectionBySlug(params.slug);
  
  if (!collection) {
    notFound();
  }

  const collectionProducts = await getProducts({ collection: collection.slug });
  const countText = `${collectionProducts.length} ouvrage${collectionProducts.length > 1 ? 's' : ''} dans cette sélection.`;

  return (
    <main className="collection-page">
      <nav aria-label="Fil d'Ariane" className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <Link href="/collections">Collections</Link>
        <ChevronDown size={14} />
        <span>{collection.title}</span>
      </nav>
      <div className="collection-hero">
        <div>
          <span className="eyebrow">{collection.eyebrow}</span>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
        </div>
        {collectionProducts.length > 0 && (
          <div className="collection-stack">
            {collectionProducts.map((p) => (
              <Cover key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
      <section className="collection-products">
        <SectionTitle eyebrow="LA SÉLECTION AL FURQAN" title={countText} />
        {collectionProducts.length > 0 ? (
          <div className="book-grid">
            {collectionProducts.map((product) => (
              <BookCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFF', borderRadius: 12, border: '1px solid var(--line)' }}>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Aucun ouvrage n&apos;est actuellement assigné à cette collection.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
