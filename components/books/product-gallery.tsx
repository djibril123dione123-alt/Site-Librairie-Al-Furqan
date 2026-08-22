'use client';

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { ProductCoverImage } from './product-cover-image';
import { Cover } from './cover';
import type { Product } from '@/lib/types/ui';
import { BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductGalleryHandle {
  /** Opens the same lightbox, filtered to inside/toc pages — the one canonical Feuilleter entry point. */
  openFeuilleter: () => void;
}

function typeLabel(type?: string) {
  if (type === 'cover') return 'Couverture';
  if (type === 'back') return 'Dos';
  if (type === 'spine') return 'Tranche';
  if (type === 'inside') return 'Intérieur';
  if (type === 'toc') return 'Sommaire';
  return 'Image';
}

export const ProductGallery = forwardRef<ProductGalleryHandle, { product: Product }>(function ProductGallery(
  { product },
  ref
) {
  const images = product.images || [];
  const leafableImages = images.filter((img) => img.type === 'inside' || img.type === 'toc');
  const hasLeafablePages = leafableImages.length > 0;

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [feuilleterMode, setFeuilleterMode] = useState(false);

  // Two-layer ping-pong crossfade for the main stage image — avoids both a
  // blank flash (remount) and an abrupt cut (plain src swap on one <img>).
  const [layerAIdx, setLayerAIdx] = useState(0);
  const [layerBIdx, setLayerBIdx] = useState(0);
  const [showA, setShowA] = useState(true);
  useEffect(() => {
    if (showA) setLayerBIdx(activeIdx);
    else setLayerAIdx(activeIdx);
    setShowA((prev) => !prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const activeImages = feuilleterMode ? leafableImages : images;

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setFeuilleterMode(false);
  }, []);

  const openFeuilleter = useCallback(() => {
    if (!hasLeafablePages) return;
    setFeuilleterMode(true);
    setActiveIdx(0);
    setLightboxOpen(true);
  }, [hasLeafablePages]);

  const openLightbox = useCallback((index: number) => {
    setFeuilleterMode(false);
    setActiveIdx(index);
    setLightboxOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openFeuilleter }), [openFeuilleter]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        if (activeImages.length > 1) setActiveIdx((i) => (i + 1) % activeImages.length);
      } else if (e.key === 'ArrowLeft') {
        if (activeImages.length > 1) setActiveIdx((i) => (i - 1 + activeImages.length) % activeImages.length);
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [lightboxOpen, activeImages.length, closeLightbox]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus management: move focus into the dialog on open, restore it on close.
  useEffect(() => {
    if (lightboxOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus();
      previouslyFocused.current = null;
    }
  }, [lightboxOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) setActiveIdx((i) => (i + 1) % images.length);
    else setActiveIdx((i) => (i - 1 + images.length) % images.length);
  };

  if (images.length <= 1 && !product.coverUrl) {
    return (
      <div className="product-gallery">
        <div className="gallery-stage gallery-main">
          <Cover product={product} />
        </div>
        <div className="gallery-caption">
          <span>Édition Al Furqan</span>
        </div>
      </div>
    );
  }

  const activeImg = images[activeIdx] || { url: product.coverUrl, type: 'cover' as const };

  return (
    <div className="product-gallery">
      {images.length > 1 && (
        <div className="gallery-thumbnails" role="tablist" aria-label="Images du produit">
          {images.map((img, i) => (
            <button
              key={img.id || i}
              type="button"
              role="tab"
              aria-selected={activeIdx === i}
              className={`gallery-thumb ${activeIdx === i ? 'active' : ''}`}
              onClick={() => setActiveIdx(i)}
              title={typeLabel(img.type)}
              aria-label={typeLabel(img.type)}
            >
              <ProductCoverImage src={img.url} alt={typeLabel(img.type)} fill sizes="48px" style={{ objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      )}

      <div className="gallery-stage gallery-main">
        <button
          type="button"
          className="gallery-image-button"
          onClick={() => openLightbox(activeIdx)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label={`Agrandir l'image — ${typeLabel(activeImg.type)}`}
        >
          <span className={`gallery-crossfade-layer ${showA ? 'is-visible' : ''}`}>
            <ProductCoverImage
              src={images[layerAIdx]?.url || product.coverUrl}
              alt={`Photo de ${product.title}`}
              fill
              sizes="(max-width: 768px) 90vw, 480px"
              className="gallery-product-image"
              style={{ objectFit: 'contain' }}
              priority
            />
          </span>
          <span className={`gallery-crossfade-layer ${!showA ? 'is-visible' : ''}`}>
            <ProductCoverImage
              src={images[layerBIdx]?.url || product.coverUrl}
              alt={`Photo de ${product.title}`}
              fill
              sizes="(max-width: 768px) 90vw, 480px"
              className="gallery-product-image"
              style={{ objectFit: 'contain' }}
            />
          </span>
        </button>

        {images.length > 1 && (
          <div className="gallery-dots" aria-hidden="true">
            {images.map((_, i) => (
              <span key={i} className={`gallery-dot ${activeIdx === i ? 'active' : ''}`} />
            ))}
          </div>
        )}

        {hasLeafablePages && (
          <button type="button" className="button button-cream btn-sm floating-feuilleter" onClick={openFeuilleter}>
            <BookOpen size={16} className="icon-feuilleter" /> Feuilleter l&apos;édition
          </button>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={feuilleterMode ? `Feuilleter ${product.title}` : `Galerie — ${product.title}`}
          ref={dialogRef}
          onClick={closeLightbox}
        >
          <button ref={closeButtonRef} className="lightbox-close" onClick={closeLightbox} aria-label="Fermer l'aperçu">
            <X size={28} />
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-image-wrap">
              {activeImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="lightbox-nav prev"
                    onClick={() => setActiveIdx((i) => (i - 1 + activeImages.length) % activeImages.length)}
                    aria-label="Image précédente"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className="lightbox-nav next"
                    onClick={() => setActiveIdx((i) => (i + 1) % activeImages.length)}
                    aria-label="Image suivante"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {activeImages[activeIdx]?.url ? (
                <ProductCoverImage
                  key={activeIdx}
                  src={activeImages[activeIdx].url}
                  alt="Aperçu grand format"
                  fill
                  className="animate-fade"
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div style={{ transform: 'scale(1.5)' }} className="animate-fade">
                  <Cover product={product} />
                </div>
              )}
            </div>

            {feuilleterMode && (
              <div className="lightbox-caption">
                Extrait / Sommaire — Page {activeIdx + 1} sur {activeImages.length}
              </div>
            )}

            {activeImages.length > 1 && (
              <div className="lightbox-thumbs">
                {activeImages.map((img, i) => (
                  <button
                    key={img.id || i}
                    type="button"
                    className={`lightbox-thumb ${activeIdx === i ? 'active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`Voir la miniature ${i + 1}`}
                  >
                    <ProductCoverImage src={img.url} alt={`Miniature ${i + 1}`} fill sizes="48px" style={{ objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
