import { BookOpen } from 'lucide-react';
import { ProductCoverImage } from './product-cover-image';
import type { ProductImage } from '@/lib/types/ui';

/**
 * Look-inside teaser. Never a second, disconnected modal — clicking it opens
 * the same ProductGallery lightbox in Feuilleter mode via `onOpen`.
 */
export function ProductInsidePreview({ images, onOpen }: { images: ProductImage[]; onOpen: () => void }) {
  if (images.length === 0) return null;
  const [main, companion] = images;

  return (
    <div className="pdp-module pdp-inside-preview">
      <h2 className="pdp-module-heading">À l&apos;intérieur</h2>
      <p className="pdp-module-lede">Un aperçu des pages intérieures et du sommaire de cette édition.</p>
      <button
        type="button"
        className="inside-preview-stage"
        onClick={onOpen}
        aria-label="Feuilleter l'édition — voir les pages intérieures"
      >
        <span className="inside-preview-images">
          <span className="inside-preview-main">
            <ProductCoverImage
              src={main.url}
              alt={main.alt || 'Page intérieure'}
              fill
              sizes="(max-width: 768px) 60vw, 320px"
              style={{ objectFit: 'contain' }}
            />
          </span>
          {companion && (
            <span className="inside-preview-companion">
              <ProductCoverImage
                src={companion.url}
                alt={companion.alt || 'Page intérieure'}
                fill
                sizes="180px"
                style={{ objectFit: 'contain' }}
              />
            </span>
          )}
        </span>
        <span className="inside-preview-cta">
          <BookOpen size={16} /> Feuilleter l&apos;édition
        </span>
      </button>
    </div>
  );
}
