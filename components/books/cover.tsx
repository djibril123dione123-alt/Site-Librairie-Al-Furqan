import React from 'react';
import Image from 'next/image';
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

  if (realUrl) {
    const isRemote = realUrl.startsWith('http') || realUrl.startsWith('/');

    return (
      <div className={`cover-real-wrap ${small ? 'cover-small' : ''}`} style={{ position: 'relative', width: '100%', height: small ? 60 : 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isRemote ? (
          <Image
            src={realUrl}
            alt={`Couverture de ${product.title}`}
            fill
            sizes={small ? "48px" : "(max-width: 768px) 160px, 220px"}
            priority={priority}
            style={{
              objectFit: 'contain',
              borderRadius: 4,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
            }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={realUrl}
            alt={`Couverture de ${product.title}`}
            style={{
              maxWidth: '100%',
              maxHeight: small ? 60 : 210,
              objectFit: 'contain',
              borderRadius: 4,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
            }}
          />
        )}
      </div>
    );
  }

  const bgColor = colorMap[product.color] || '#0f3746';

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
