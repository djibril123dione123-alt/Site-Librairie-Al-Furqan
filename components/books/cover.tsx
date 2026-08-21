import React from 'react';
import { ProductCoverImage } from './product-cover-image';
import type { Product } from '@/lib/types/ui';

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

export function Cover({ product, small = false, priority = false }: { product: Product; small?: boolean; priority?: boolean }) {
  const realUrl = product.coverUrl || product.images?.[0]?.url;
  const bgColor = colorMap[product.color] || '#0f3746';
  // Réutilise exactement les mêmes classes que la couverture illustrée (`.cover`, `.cover-small`,
  // et toutes leurs variantes contextuelles en CSS) pour hériter des mêmes dimensions partout où
  // le composant est utilisé (grille catalogue, hero, panier, galerie, etc.). Sans cela, ce wrapper
  // n'a aucune taille intrinsèque et s'effondre à 0px dans les conteneurs en grid/flex.
  const sizeClassName = `cover cover-real cover-${product.color} ${small ? 'cover-small' : ''}`;

  if (realUrl) {
    return (
      <div
        className={sizeClassName}
        style={
          {
            '--cover-color': bgColor,
            '--cover-ink': product.ink || '#f7e6c4',
          } as React.CSSProperties
        }
      >
        <ProductCoverImage
          src={realUrl}
          alt={`Couverture de ${product.title}`}
          fill
          sizes={small ? "48px" : "(max-width: 768px) 160px, 220px"}
          priority={priority}
          style={{
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`cover cover-${product.color} ${small ? 'cover-small' : ''}`}
      style={
        {
          '--cover-color': bgColor,
          '--cover-ink': product.ink || '#f7e6c4',
        } as React.CSSProperties
      }
    >
      <div className="cover-rule" />
      <span className="cover-mark">AL FURQAN</span>
      <div className="cover-title">{product.title}</div>
      <span className="cover-author">{product.author}</span>
      <span className="cover-symbol">✦</span>
    </div>
  );
}
