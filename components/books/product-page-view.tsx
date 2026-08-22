'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, Video } from 'lucide-react';
import { getEmbeddableVideoUrl } from '@/lib/utils/video-utils';
import { ProductActions } from './product-actions';
import { RecentlyViewed } from './recently-viewed';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from './book-card';
import { ProductGallery, type ProductGalleryHandle } from './product-gallery';
import { ProductStory } from './product-story';
import { ProductInsidePreview } from './product-inside-preview';
import { ProductBibliography } from './product-bibliography';
import { ProductAuthorBlock } from './product-author-block';
import { ProductViewTracker } from './product-view-tracker';
import type { Product } from '@/lib/types/ui';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Client half of the PDP — object overture + sticky gallery + scrolling
 * editorial column. Data fetching, metadata and JSON-LD schema stay in the
 * server page (app/livres/[slug]/page.tsx) which renders this component.
 */
export function ProductPageView({ product, related }: { product: Product; related: Product[] }) {
  const galleryRef = useRef<ProductGalleryHandle>(null);

  const categorySlug = product.categorySlug || slugify(product.category);
  const hasKnownAuthor = Boolean(product.author && product.author !== 'Auteur inconnu');
  const insideImages = product.images?.filter((i) => i.type === 'inside' || i.type === 'toc') || [];
  const videoInfo = getEmbeddableVideoUrl(product.videoUrl);

  return (
    <main className="pdp">
      <ProductViewTracker productId={product.id} />

      <nav className="pdp-breadcrumb" aria-label="Fil d'Ariane">
        <Link href="/">Accueil</Link>
        <ChevronRight size={12} />
        <Link href={`/categories/${categorySlug}`}>{product.category}</Link>
        <ChevronRight size={12} />
        <span className="pdp-breadcrumb-current">{product.title}</span>
      </nav>

      <div className="pdp-overture">
        <div className="pdp-gallery-col">
          <ProductGallery ref={galleryRef} product={product} />
        </div>

        <div className="pdp-info-col">
          <Link href={`/categories/${categorySlug}`} className="eyebrow pdp-eyebrow">
            {product.category}
          </Link>
          <h1 className="pdp-title">{product.title}</h1>
          {product.subtitle && <p className="pdp-subtitle">{product.subtitle}</p>}
          {hasKnownAuthor && (
            <p className="pdp-byline">
              par{' '}
              <Link href={`/auteurs/${product.authorSlug || slugify(product.author)}`} className="text-link">
                {product.author}
              </Link>
              {product.publisher && <span className="pdp-byline-publisher"> · {product.publisher}</span>}
            </p>
          )}

          <ProductActions product={product} />

          <div className="pdp-story-modules">
            <ProductStory description={product.description} shortDescription={product.shortDescription} />

            {videoInfo && (
              <div className="pdp-module pdp-video">
                <h2 className="pdp-module-heading">Présentation vidéo</h2>
                {videoInfo.type === 'iframe' ? (
                  <div className="pdp-video-frame">
                    <iframe
                      src={videoInfo.embedUrl}
                      title={`Présentation vidéo de ${product.title}`}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a href={videoInfo.externalUrl} target="_blank" rel="noopener noreferrer" className="button button-dark">
                    <Video size={16} /> Voir la vidéo de présentation ↗
                  </a>
                )}
              </div>
            )}

            <ProductInsidePreview images={insideImages} onOpen={() => galleryRef.current?.openFeuilleter()} />
            <ProductBibliography product={product} />
            <ProductAuthorBlock product={product} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="products-section related">
          <SectionTitle eyebrow="POUR POURSUIVRE VOTRE LECTURE" title="Dans le même univers" />
          <div className="book-grid">
            {related.map((item) => (
              <BookCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed currentProductId={product.id} />
    </main>
  );
}
