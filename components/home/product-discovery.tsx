import { SectionTitle } from '../ui/section-title';
import { BookCard } from '../books/book-card';
import type { Product } from '@/lib/types/ui';

export function ProductDiscovery({
  products,
  eyebrow,
  title,
  href,
}: {
  products: Product[];
  eyebrow: string;
  title: string;
  href: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="home-band home-band-alt">
      <SectionTitle eyebrow={eyebrow} title={title} link="Voir le catalogue" href={href} />
      <div className={`discovery-rail ${products.length < 4 ? 'is-compact' : ''}`}>
        {products.map((product) => (
          <div className="discovery-item" key={product.id}>
            <BookCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
