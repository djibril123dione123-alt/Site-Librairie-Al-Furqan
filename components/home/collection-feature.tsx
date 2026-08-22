import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Cover } from '../books/cover';
import type { Collection, Product } from '@/lib/types/ui';

/**
 * The immersive beat right after the hero — but only when a real,
 * published collection with real products exists. There is no
 * placeholder/"coming soon" rendering: app/page.tsx simply omits this
 * section entirely when getCollections() returns nothing.
 */
export function CollectionFeature({ collection, products }: { collection: Collection; products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="home-collection">
      <div className="home-collection-copy">
        <span className="eyebrow">{collection.eyebrow}</span>
        <h2>{collection.title}</h2>
        <p>{collection.description}</p>
        <Link href={`/collections/${collection.slug}`} className="button button-dark">
          Découvrir la sélection <ArrowRight size={17} />
        </Link>
      </div>
      <div className="home-collection-stack">
        {products.slice(0, 3).map((product) => (
          <Cover key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
