import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Cover } from '../books/cover';
import type { PublisherWithCount } from '@/lib/data/entities';
import type { Product } from '@/lib/types/ui';

/**
 * Publishers are edition-house-led: name + count + a small strip of real
 * covers from their catalogue — deliberately different from the author
 * directory's pure-typography rows (see brief §62).
 */
export function PublisherDirectory({
  publishers,
  productsByPublisherSlug,
}: {
  publishers: PublisherWithCount[];
  productsByPublisherSlug: Map<string, Product[]>;
}) {
  return (
    <div className="publisher-directory">
      {publishers.map((publisher) => {
        const covers = (productsByPublisherSlug.get(publisher.slug) || []).slice(0, 3);
        return (
          <Link href={`/editeurs/${publisher.slug}`} key={publisher.id} className="publisher-directory-row">
            <div className="publisher-directory-info">
              <strong>{publisher.name}</strong>
              <span className="publisher-directory-meta">
                {publisher.bookCount} ouvrage{publisher.bookCount > 1 ? 's' : ''}
              </span>
            </div>
            {covers.length > 0 && (
              <div className="publisher-directory-covers">
                {covers.map((p) => (
                  <Cover key={p.id} product={p} small />
                ))}
              </div>
            )}
            <ArrowRight size={15} className="publisher-directory-arrow" />
          </Link>
        );
      })}
    </div>
  );
}
