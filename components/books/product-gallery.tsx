'use client';

import { useState, useEffect, useCallback } from 'react';
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

  return (
    <div className="product-gallery">
      <div className="gallery-main" style={{ position: 'relative' }}>
        {activeImg.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={activeImg.url}
            alt={activeImg.alt || `Photo de ${product.title}`}
            style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', cursor: 'pointer', borderRadius: 8 }}
            onClick={() => openLightbox(activeIdx)}
          />
        ) : (
          <Cover product={product} />
        )}

        {hasLeafablePages && (
          <button
            type="button"
            className="button button-cream btn-sm"
            style={{ position: 'absolute', bottom: 12, right: 12, padding: '6px 12px', fontSize: 11 }}
            onClick={openFeuilleter}
          >
            <BookOpen size={14} /> Feuilleter ({leafableImages.length} p.)
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbnails" style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto' }}>
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              style={{
                border: activeIdx === i ? '2px solid var(--gold)' : '1px solid var(--line)',
                borderRadius: 6,
                padding: 2,
                background: '#FFF',
                cursor: 'pointer',
              }}
              onClick={() => setActiveIdx(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Miniature ${i + 1}`}
                style={{ width: 48, height: 60, objectFit: 'contain' }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox / Feuilleter modal */}
      {lightboxOpen && (
        <div
          className="search-panel"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            setLightboxOpen(false);
            setFeuilleterMode(false);
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                color: '#FFF',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => {
                setLightboxOpen(false);
                setFeuilleterMode(false);
              }}
              aria-label="Fermer l'aperçu"
            >
              <X size={28} />
            </button>

            {activeImages.length > 1 && (
              <>
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    left: -48,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#FFF',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    padding: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveIdx((i) => (i - 1 + activeImages.length) % activeImages.length)}
                  aria-label="Image précédente"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: -48,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#FFF',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    padding: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveIdx((i) => (i + 1) % activeImages.length)}
                  aria-label="Image suivante"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {activeImages[activeIdx]?.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeImages[activeIdx].url}
                alt="Aperçu grand format"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <Cover product={product} />
            )}

            {feuilleterMode && (
              <div style={{ color: '#FFF', textAlign: 'center', marginTop: 12, fontSize: 13 }}>
                Extrait / Sommaire — Page {activeIdx + 1} sur {activeImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
