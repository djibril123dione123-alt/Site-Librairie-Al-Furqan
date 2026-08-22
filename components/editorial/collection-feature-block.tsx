import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Cover } from '../books/cover';
import type { Collection, Product } from '@/lib/types/ui';

/**
 * One alternating editorial block per collection on /collections — never
 * a repeat.auto-fill bordered-card grid. The first collection gets the
 * largest composition, the second mirrors it, and any further collections
 * fall back to a quieter full-width strip rather than repeating the same
 * large treatment forever.
 */
export function CollectionFeatureBlock({
  collection,
  products,
  variant,
}: {
  collection: Collection;
  products: Product[];
  variant: 'hero-left' | 'hero-right' | 'strip';
}) {
  const count = products.length;
  const countLabel = count > 0 ? `${count} ouvrage${count > 1 ? 's' : ''}` : null;

  if (variant === 'strip') {
    return (
      <Link href={`/collections/${collection.slug}`} className="collection-strip">
        <div className="collection-strip-copy">
          <span className="eyebrow">{collection.eyebrow}</span>
          <strong>{collection.title}</strong>
        </div>
        {countLabel && <span className="collection-strip-count">{countLabel}</span>}
        <ArrowRight size={18} />
      </Link>
    );
  }

  const reversed = variant === 'hero-right';

  return (
    <div className={`collection-feature-block ${reversed ? 'is-reversed' : ''}`}>
      <div className="collection-feature-copy">
        <span className="eyebrow">{collection.eyebrow}</span>
        <h2>{collection.title}</h2>
        <p>{collection.description}</p>
        {countLabel && <span className="collection-feature-count">{countLabel}</span>}
        <Link href={`/collections/${collection.slug}`} className="button button-dark">
          Découvrir la sélection <ArrowRight size={17} />
        </Link>
      </div>
      <div className="collection-feature-media">
        {products.length > 0 ? (
          products.slice(0, 3).map((p) => <Cover key={p.id} product={p} />)
        ) : (
          <span className="collection-feature-mark" aria-hidden="true">✦</span>
        )}
      </div>
    </div>
  );
}
