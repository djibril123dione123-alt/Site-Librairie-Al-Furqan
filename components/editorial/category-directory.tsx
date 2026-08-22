import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Category } from '@/lib/types/ui';

/**
 * Dense, typography-led taxonomy grid for /categories — distinct from the
 * homepage's capped 8-tile beat (components/home/category-tiles.tsx):
 * this shows every real visible category, unordered by stock (taxonomy,
 * not a curated homepage moment).
 */
export function CategoryDirectory({ categories }: { categories: (Category & { count: number })[] }) {
  return (
    <div className="category-directory">
      {categories.map((category) => (
        <Link href={`/categories/${category.slug}`} key={category.id} className="category-directory-item">
          <strong>{category.name}</strong>
          <span className="category-directory-meta">
            {category.count > 0 && (
              <span className="category-directory-count">
                {category.count} ouvrage{category.count > 1 ? 's' : ''}
              </span>
            )}
            <ArrowRight size={14} />
          </span>
        </Link>
      ))}
    </div>
  );
}
