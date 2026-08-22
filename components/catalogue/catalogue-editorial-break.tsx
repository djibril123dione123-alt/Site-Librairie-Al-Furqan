import Link from 'next/link';
import type { Collection } from '@/lib/types/ui';

/**
 * At most one editorial pause per catalogue view — never an ad banner, never
 * fabricated. Renders nothing unless a real published collection exists AND
 * the browsing context is broad enough for the pause to make sense (see the
 * gating logic in CatalogueClient, not here).
 */
export function CatalogueEditorialBreak({ collection }: { collection: Collection }) {
  return (
    <div className="catalogue-break">
      <div className="catalogue-break-inner">
        <span className="eyebrow">{collection.eyebrow || 'Sélection éditoriale'}</span>
        <h3>{collection.title}</h3>
        {collection.description && <p>{collection.description}</p>}
        <Link href={`/collections/${collection.slug}`} className="text-link">
          Découvrir la sélection →
        </Link>
      </div>
    </div>
  );
}
