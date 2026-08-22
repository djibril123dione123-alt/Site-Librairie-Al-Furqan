import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionTitle } from '../ui/section-title';
import type { Category } from '@/lib/types/ui';

export function CategoryTiles({ categories }: { categories: (Category & { count: number })[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="home-band">
      <SectionTitle eyebrow="PARCOURIR PAR UNIVERS" title="Le savoir, par affinités." link="Voir toutes les catégories" href="/catalogue" />
      <div className="category-tile-grid">
        {categories.map((category, index) => (
          <Link
            href={`/catalogue?categorie=${encodeURIComponent(category.name)}`}
            key={category.id}
            className="category-tile"
          >
            <span className="category-tile-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{category.name}</strong>
            <span className="category-tile-meta">
              {category.count > 0 && <span className="category-tile-count">{category.count}</span>}
              <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
