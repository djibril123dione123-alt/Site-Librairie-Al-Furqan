'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductCoverImage } from './product-cover-image';
import { Cover } from './cover';
import type { Product } from '@/lib/types/ui';
import { BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';

export function ProductGallery({ product }: { product: Product }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [feuilleterMode, setFeuilleterMode] = useState(false);

  const images = product.images || [];
  const leafableImages = images.filter((img) => img.type === 'inside' || img.type === 'toc');
  const activeImages = feuilleterMode ? leafableImages : images;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        setFeuilleterMode(false);
      } else if (e.key === 'ArrowRight') {
        if (activeImages.length > 1) {
          setActiveIdx((i) => (i + 1) % activeImages.length);
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeImages.length > 1) {
          setActiveIdx((i) => (i - 1 + activeImages.length) % activeImages.length);
        }
      }
    },
    [lightboxOpen, activeImages.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (images.length <= 1 && !product.coverUrl) {
    return (
      <div className="product-gallery">
        <div className="gallery-main">
          <Cover product={product} />
        </div>
        <div className="gallery-caption">
          <span>Édition Al Furqan</span>
        </div>
      </div>
    );
  }

  const activeImg = images[activeIdx] || { url: product.coverUrl, type: 'cover' };
  const hasLeafablePages = leafableImages.length > 0;

  const openFeuilleter = () => {
    setFeuilleterMode(true);
    setActiveIdx(0);
    setLightboxOpen(true);
  };

  const openLightbox = (index: number) => {
    setFeuilleterMode(false);
    setActiveIdx(index);
    setLightboxOpen(true);
  };

  const isRemoteActive = Boolean(activeImg.url && (activeImg.url.startsWith('http') || activeImg.url.startsWith('/')));

  return (
    <div className="product-gallery">
      <div className="gallery-stage gallery-main">
        {activeImg.url ? (
          <button 
            type="button" 
            className="gallery-image-button" 
            onClick={() => openLightbox(activeIdx)}
            aria-label="Agrandir l'image"
          >
            <ProductCoverImage
              src={activeImg.url}
              alt={activeImg.alt || `Photo de ${product.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 450px"
              className="gallery-product-image"
              style={{ objectFit: 'contain', padding: '10%' }}
              priority
            />
          </button>
        ) : (
          <div className="gallery-image-button" onClick={() => openLightbox(activeIdx)}>
            <div className="gallery-product-image" style={{ width: '230px', height: '370px' }}>
              <Cover product={product} />
            </div>
          </div>
        )}

        {hasLeafablePages && (
          <button
            type="button"
            className="button button-cream btn-sm floating-feuilleter"
            style={{ position: 'absolute', bottom: 20, right: 20, padding: '10px 18px', fontSize: 13, zIndex: 10, boxShadow: 'var(--shadow-premium)', fontWeight: 600 }}
            onClick={openFeuilleter}
          >
            <BookOpen size={16} className="icon-feuilleter" /> Feuilleter l&apos;édition
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbnails" style={{ display: 'flex', gap: 16, marginTop: 24, justifyContent: 'center' }}>
          {images.slice(0, 5).map((img, i) => {
            const isLastVisible = i === 4;
            const remainingCount = images.length - 5;
            
            let typeLabel = "Image";
            if (img.type === 'cover') typeLabel = "Couverture";
            if (img.type === 'back') typeLabel = "Dos";
            if (img.type === 'spine') typeLabel = "Tranche";
            if (img.type === 'inside') typeLabel = "Intérieur";
            if (img.type === 'toc') typeLabel = "Sommaire";

            return (
              <button
                key={i}
                type="button"
                className={`gallery-thumb ${activeIdx === i ? 'active' : ''}`}
                onClick={() => isLastVisible && remainingCount > 0 ? openLightbox(i) : setActiveIdx(i)}
                title={typeLabel}
                aria-label={typeLabel}
                style={{
                  width: 72,
                  height: 96,
                  position: 'relative',
                  flexShrink: 0,
                  background: 'var(--paper)',
                  borderRadius: 6
                }}
              >
                <ProductCoverImage
                  src={img.url}
                  alt={`Miniature ${i + 1}`}
                  fill
                  sizes="64px"
                  style={{ objectFit: 'contain', padding: '10%' }}
                />
                
                {isLastVisible && remainingCount > 0 && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(9, 30, 36, 0.65)', 
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-serif)', fontSize: 18, borderRadius: 6
                  }}>
                    +{remainingCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox / Feuilleter modal */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => { setLightboxOpen(false); setFeuilleterMode(false); }}>
          <button
            className="lightbox-close"
            onClick={() => { setLightboxOpen(false); setFeuilleterMode(false); }}
            aria-label="Fermer l'aperçu"
          >
            <X size={32} />
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
                  src={activeImages[activeIdx].url}
                  alt="Aperçu grand format"
                  fill
                  className="animate-fade"
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div style={{ transform: 'scale(1.5)' }} className="animate-fade" key="cover">
                  <Cover product={product} />
                </div>
              )}
            </div>

            {feuilleterMode && (
              <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 24, fontSize: 13, letterSpacing: '0.05em' }}>
                Extrait / Sommaire — Page {activeIdx + 1} sur {activeImages.length}
              </div>
            )}
            
            {activeImages.length > 1 && (
              <div className="lightbox-thumbs">
                {activeImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`lightbox-thumb ${activeIdx === i ? 'active' : ''}`}
                    style={{ width: 48, height: 64, background: 'var(--surface)' }}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`Voir la miniature ${i + 1}`}
                  >
                    <ProductCoverImage
                      src={img.url}
                      alt={`Miniature ${i + 1}`}
                      fill
                      sizes="48px"
                      style={{ objectFit: 'contain' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
