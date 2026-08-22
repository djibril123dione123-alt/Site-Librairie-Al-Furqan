import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { AuthorWithCount } from '@/lib/data/entities';

/**
 * Authors are person-led: pure typography, no portrait/avatar UI (no real
 * images exist in the schema). Distinct from the publisher directory,
 * which carries small real cover strips instead.
 */
export function AuthorDirectory({ authors }: { authors: AuthorWithCount[] }) {
  return (
    <div className="author-directory">
      {authors.map((author) => (
        <Link href={`/auteurs/${author.slug}`} key={author.id} className="author-directory-row">
          <strong>{author.name}</strong>
          <span className="author-directory-meta">
            {author.bookCount} ouvrage{author.bookCount > 1 ? 's' : ''}
            <ArrowRight size={14} />
          </span>
        </Link>
      ))}
    </div>
  );
}
