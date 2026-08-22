import React from 'react';
import { ProductCoverImage } from './product-cover-image';
import type { Product, ProductImage } from '@/lib/types/ui';

const colorMap: Record<string, string> = {
  navy: '#0f3746',
  sand: '#d6b67b',
  terracotta: '#a64e3d',
  ochre: '#b27b36',
  sage: '#607967',
  slate: '#536b77',
  sky: '#c7dde0',
  blue: '#347183',
  plum: '#704d68',
  rose: '#d9a9a0',
  ink: '#1d3035',
  lavender: '#a9b7b1',
};

/** back wins over inside per the card-hover secondary-image rule; never toc/other. */
function pickSecondaryImage(product: Product): ProductImage | null {
  const images = product.images;
  if (!images || images.length === 0) return null;
  return images.find((i) => i.type === 'back') || images.find((i) => i.type === 'inside') || null;
}

/**
 * BookStage — the physical presentation of a book on screen.
 *
 * Owns: sizing, the real/illustrated cover choice, loading/error fallback,
 * the contact shadow + hover lift, and (when `interactive`) the cover→back
 * hover crossfade. Knows nothing about cart, wishlist or delivery — those
 * are composed around it by the caller (see BookCard).
 */
export function BookStage({
  product,
  size = 'md',
  interactive = false,
  priority = false,
}: {
  product: Product;
  size?: 'sm' | 'md';
  interactive?: boolean;
  priority?: boolean;
}) {
  const small = size === 'sm';
  const realUrl = product.coverUrl || product.images?.[0]?.url;
  const secondary = interactive ? pickSecondaryImage(product) : null;
  const bgColor = colorMap[product.color] || '#0f3746';
  const cssVars = {
    '--cover-color': bgColor,
    '--cover-ink': product.ink || '#f7e6c4',
  } as React.CSSProperties;

  if (realUrl) {
    return (
      <div
        className={`book-object cover cover-real cover-${product.color} ${small ? 'cover-small' : ''}`}
        style={cssVars}
      >
        {/* The crossfade opacity lives on this wrapper, not on the <Image> itself —
            ProductCoverImage sets its own inline opacity for its loaded-fade-in,
            which would otherwise always win over a CSS class rule. */}
        <div className="book-object-layer book-object-primary">
          <ProductCoverImage
            src={realUrl}
            alt={`Couverture de ${product.title}`}
            fill
            sizes={small ? '48px' : '(max-width: 768px) 160px, 220px'}
            priority={priority}
            style={{ objectFit: 'contain' }}
          />
        </div>
        {secondary && (
          <div className="book-object-layer book-object-secondary">
            <ProductCoverImage
              src={secondary.url}
              alt={secondary.alt || `${secondary.type === 'back' ? 'Quatrième de couverture' : 'Page intérieure'} de ${product.title}`}
              fill
              sizes={small ? '48px' : '(max-width: 768px) 160px, 220px'}
              style={{ objectFit: 'contain' }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`book-object cover cover-${product.color} ${small ? 'cover-small' : ''}`}
      style={cssVars}
    >
      <div className="cover-rule" />
      <span className="cover-mark">AL FURQAN</span>
      <div className="cover-title">{product.title}</div>
      <span className="cover-author">{product.author}</span>
      <span className="cover-symbol">✦</span>
    </div>
  );
}
