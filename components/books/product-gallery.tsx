'use client';

import { useState } from 'react';
import { Cover } from './cover';
import type { Product } from '@/lib/types/ui';
import { BookOpen, Eye, X } from 'lucide-react';

export function ProductGallery({ product }: { product: Product }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const images = product.images || [];

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
  const hasPages = images.some((img) => img.type === 'inside' || img.type === 'toc');

  return (
    <div className="product-gallery">
      <div className="gallery-main" style={{ position: 'relative' }}>
        {activeImg.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={activeImg.url}
            alt={activeImg.alt || `Photo de ${product.title}`}
            style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain', cursor: 'pointer', borderRadius: 8 }}
            onClick={() => setLightboxOpen(true)}
          />
        ) : (
          <Cover product={product} />
        )}

        {hasPages && (
          <button
            type="button"
            className="button button-cream btn-sm"
            style={{ position: 'absolute', bottom: 12, right: 12, padding: '6px 12px', fontSize: 11 }}
            onClick={() => setLightboxOpen(true)}
          >
            <BookOpen size={14} /> Feuilleter
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
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setLightboxOpen(false)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              style={{ position: 'absolute', top: -40, right: 0, color: '#FFF', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setLightboxOpen(false)}
            >
              <X size={28} />
            </button>
            {activeImg.url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeImg.url}
                alt="Aperçu grand format"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <Cover product={product} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
