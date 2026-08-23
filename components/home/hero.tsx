import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BookStage } from '../books/book-stage';
import { HomeSearchButton } from './search-buttons';
import type { Product } from '@/lib/types/ui';

/**
 * Hero — "nature morte asymétrique". One real book, not a decorative
 * three-book composition. Product selection is deterministic and happens
 * in app/page.tsx (featured > new arrival > first published), never here.
 *
 * Wrapped in a full-width surface section so its --paper background is a
 * deliberate token choice rather than an implicit inheritance from body —
 * .hero itself stays a centered max-width composition unchanged.
 */
export function Hero({ product }: { product: Product | null }) {
  return (
    <section className="home-hero-surface">
      <div className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Librairie islamique · Saint-Louis, Sénégal</span>
          <h1>
            Des livres pour <em>apprendre,</em>
            <br />
            comprendre et transmettre.
          </h1>
          <p>
            Une sélection soignée de Corans, tafsirs, ouvrages de croyance, spiritualité et littérature islamique.
          </p>
          <div className="hero-actions">
            <Link href="/catalogue" className="button button-dark">
              Explorer le catalogue <ArrowRight size={17} />
            </Link>
          </div>
          <HomeSearchButton />
        </div>

        <div className="hero-stage">
          {product ? (
            <Link href={`/livres/${product.slug}`} className="hero-book-link" aria-label={`Découvrir ${product.title}`}>
              <div className="book-stage hero-book-stage">
                <BookStage product={product} size="md" priority />
              </div>
            </Link>
          ) : (
            <div className="hero-brand-mark" aria-hidden="true">
              <span className="hero-brand-arabic">الفُرْقَان</span>
              <span className="hero-brand-caption">
                Librairie Al Furqan
                <br />
                Saint-Louis, Sénégal
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
