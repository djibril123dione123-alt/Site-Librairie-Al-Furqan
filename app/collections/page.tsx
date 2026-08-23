import { Metadata } from 'next';
import Link from 'next/link';
import { getCollections } from '@/lib/data/collections';
import { getProducts } from '@/lib/data/products';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { CollectionFeatureBlock } from '@/components/editorial/collection-feature-block';

export const metadata: Metadata = {
  title: 'Collections Éditoriales',
  description: "Des parcours de lecture et sélections thématiques d'ouvrages islamiques choisis par la Librairie Al Furqan.",
  alternates: { canonical: '/collections' },
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  const withProducts = await Promise.all(
    collections.map(async (collection) => ({
      collection,
      products: await getProducts({ collection: collection.slug }),
    }))
  );

  return (
    <main className="entity-index-page collections-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Collections' }]} />
      <header className="entity-index-header">
        <span className="eyebrow">Sélections éditoriales</span>
        <h1>Collections</h1>
        <p>Des parcours de lecture pensés par la librairie, pas une simple liste filtrée du catalogue.</p>
      </header>

      {withProducts.length === 0 ? (
        <EmptyState
          title="Aucune collection publiée pour le moment"
          body="La librairie prépare ses premiers parcours de lecture. En attendant, tout le catalogue reste accessible."
        >
          <Link href="/catalogue" className="button button-dark">
            Explorer le catalogue
          </Link>
        </EmptyState>
      ) : (
        <div className="collections-list">
          {withProducts.map(({ collection, products }, i) => (
            <CollectionFeatureBlock
              key={collection.slug}
              collection={collection}
              products={products}
              variant={i === 0 ? 'hero-left' : i === 1 ? 'hero-right' : 'strip'}
            />
          ))}
        </div>
      )}
    </main>
  );
}
