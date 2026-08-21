'use client';

import Link from 'next/link';
import { Heart, Plus } from 'lucide-react';
import type { Product } from '@/lib/types/ui';
import { formatPrice } from '@/lib/al-furqan-data';
import { Cover } from './cover';
import { useStore } from '../providers';

export function BookCard({ product }: { product: Product }) {
  const { addToCart, toggleWish, isWished } = useStore();
  
  const unavailable = product.availability === 'Indisponible temporairement';
  const wished = isWished(product.id);

  return (
    <article className="book-card">
      <div className="book-image-wrap">
        <Link href={`/livres/${product.slug}`} aria-label={`Voir la fiche de ${product.title}`}>
          <Cover product={product} />
        </Link>
        <button
          className={`wish-button ${wished ? 'is-wished' : ''}`}
          onClick={() => toggleWish(product.id)}
          aria-label={wished ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'}
          aria-pressed={wished}
        >
          <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="book-copy">
        <span className="book-category">{product.category}</span>
        <Link href={`/livres/${product.slug}`} className="book-title">
          {product.title}
        </Link>
        <span className="book-author">{product.author}</span>
        <div className="book-bottom">
          <strong>{formatPrice(product.price)}</strong>
          {unavailable ? (
            <span className="stock-unavailable-text">Indisponible</span>
          ) : (
            <button
              className="add-mini"
              onClick={() => addToCart(product)}
              aria-label={product.variants ? `Voir les options de ${product.title}` : `Ajouter ${product.title} au panier`}
            >
              {product.variants ? 'Voir les options' : 'Ajouter'} {!product.variants && <Plus size={15} />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
