import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getSiteUrl } from '@/lib/al-furqan-data';
import { getCollectionBySlug } from '@/lib/data/collections';
import { getProducts } from '@/lib/data/products';
import { Cover } from '@/components/books/cover';
import { BookCard } from '@/components/books/book-card';
import { EditorialBreadcrumb } from '@/components/editorial/breadcrumb';
import { EditorialEmptyState } from '@/components/editorial/empty-state';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) return {};

  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: collection.title,
      description: collection.description,
      url: `${getSiteUrl()}/collections/${collection.slug}`,
    },
  };
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = await getCollectionBySlug(params.slug);
  if (!collection) notFound();

  const products = await getProducts({ collection: collection.slug });
  const countLabel = products.length > 0 ? `${products.length} ouvrage${products.length > 1 ? 's' : ''}` : null;

  return (
    <main className="collection-detail-page">
      <EditorialBreadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Collections', href: '/collections' }, { label: collection.title }]} />

      <section className="collection-detail-hero">
        <div className="collection-detail-copy">
          <span className="eyebrow">{collection.eyebrow}</span>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
        </div>
        {products.length > 0 && (
          <div className="collection-detail-media">
            {products.slice(0, 3).map((p) => (
              <Cover key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="collection-detail-books">
        <div className="collection-detail-books-heading">
          <h2>La sélection</h2>
          {countLabel && <span className="collection-detail-count">{countLabel}</span>}
        </div>

        {products.length > 0 ? (
          <div className={`entity-book-grid ${products.length < 4 ? 'is-compact' : ''}`}>
            {products.map((product) => (
              <div className="entity-book-item" key={product.id}>
                <BookCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <EditorialEmptyState
            title="Sélection en préparation"
            body="Aucun ouvrage n'est actuellement assigné à cette collection."
            ctaLabel="Voir le catalogue"
            ctaHref="/catalogue"
          />
        )}
      </section>

      {products.length > 0 && (
        <div className="collection-detail-cta">
          <Link href="/catalogue" className="text-link">
            Découvrir tout le catalogue <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </main>
  );
}
