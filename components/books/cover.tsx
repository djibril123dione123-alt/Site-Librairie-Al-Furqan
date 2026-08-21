import React from 'react';
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

export function Cover({ product, small = false }: { product: Product; small?: boolean }) {
  return (
    <div
      className={`cover cover-${product.color} ${small ? 'cover-small' : ''}`}
      style={
        {
          '--cover-color': colorMap[product.color],
          '--cover-ink': product.ink,
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
