import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { findCollection, findProduct, getSiteUrl, Product } from '@/lib/al-furqan-data';
import { Cover } from '@/components/books/cover';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const collection = findCollection(params.slug);
  if (!collection) return {};

  return {
    title: collection.title,
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

export default function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = findCollection(params.slug);
  
  if (!collection) {
    notFound();
  }

  const collectionProducts = collection.productIds
    .map((id) => findProduct(id))
    .filter((p): p is Product => Boolean(p));

  return (
    <main className="collection-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <Link href="/catalogue">Catalogue</Link>
        <ChevronDown size={14} />
        <span>{collection.title}</span>
      </div>
      <div className="collection-hero">
        <div>
          <span className="eyebrow">{collection.eyebrow}</span>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
        </div>
        <div className="collection-stack">
          {collectionProducts.map((p) => (
            <Cover key={p.id} product={p} />
          ))}
        </div>
      </div>
      <section className="collection-products">
        <SectionTitle eyebrow="LA SÉLECTION AL FURQAN" title="Trois ouvrages pour commencer." />
        <div className="book-grid">
          {collectionProducts.map((product) => (
            <BookCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
