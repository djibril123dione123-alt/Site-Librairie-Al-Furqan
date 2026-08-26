'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { isValidTikTokUrl } from '@/lib/social/tiktok';
import { TikTokVideo } from '@/components/social/tiktok-video';
import { Breadcrumb } from '@/components/ui/breadcrumb';
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
  const hasVideo = Boolean(product.videoUrl && isValidTikTokUrl(product.videoUrl));

  return (
    <main className="pdp">
      <ProductViewTracker productId={product.id} />

      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/' },
          { label: product.category, href: `/categories/${categorySlug}` },
          { label: product.title },
        ]}
      />

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

            {hasVideo && (
              <div className="pdp-module pdp-video">
                <span className="eyebrow">EN VIDÉO</span>
                <h2 className="pdp-module-heading">Découvrir cet ouvrage en vidéo</h2>
                <p className="pdp-module-lede">Une présentation publiée par la Librairie Al Furqan.</p>
                <TikTokVideo url={product.videoUrl!} title={product.title} />
                <a
                  href={product.videoUrl!}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-link pdp-video-link"
                >
                  Voir la publication sur TikTok
                </a>
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
