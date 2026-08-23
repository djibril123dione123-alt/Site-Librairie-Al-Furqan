import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BookCard } from '../books/book-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Product } from '@/lib/types/ui';

const DISPLAY_LIMIT = 12;

/**
 * Shared product surface for category/author/publisher/collection detail
 * pages — responsive grid, a left-aligned (not stretched) layout when
 * there are fewer than 4 items (same lesson as the E1 homepage), a quiet
 * empty state, and a hand-off to the catalogue once an entity grows past
 * what's worth rendering forever on one page.
 */
export function EntityBooks({
  products,
  emptyTitle,
  emptyBody,
  catalogueHref,
}: {
  products: Product[];
  emptyTitle: string;
  emptyBody: string;
  catalogueHref: string;
}) {
  if (products.length === 0) {
    return (
      <EmptyState title={emptyTitle} body={emptyBody}>
        <Link href={catalogueHref} className="button button-dark">
          Voir le catalogue
        </Link>
      </EmptyState>
    );
  }

  const shown = products.slice(0, DISPLAY_LIMIT);
  const hasMore = products.length > DISPLAY_LIMIT;

  return (
    <>
      <div className={`entity-book-grid ${shown.length < 4 ? 'is-compact' : ''}`}>
        {shown.map((product) => (
          <div className="entity-book-item" key={product.id}>
            <BookCard product={product} />
          </div>
        ))}
      </div>
      {hasMore && (
        <Link href={catalogueHref} className="text-link entity-books-more">
          Voir tous les ouvrages dans le catalogue <ArrowRight size={16} />
        </Link>
      )}
    </>
  );
}
