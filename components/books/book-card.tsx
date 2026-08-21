'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Plus, ChevronRight, Check } from 'lucide-react';
import type { Product } from '@/lib/types/ui';
import { formatPrice } from '@/lib/al-furqan-data';
import { Cover } from './cover';
import { useStore } from '../providers';

export function BookCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const { addToCart, toggleWish, isWished } = useStore();
  
  const unavailable = product.availability === 'Indisponible temporairement';
  const wished = isWished(product.id);
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  useEffect(() => {
    if (added) {
      const timer = setTimeout(() => setAdded(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [added]);

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
          <Heart size={17} fill={wished ? 'currentColor' : 'none'} className="wish-icon" style={{ transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }} />
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
          ) : hasVariants ? (
            <Link
              href={`/livres/${product.slug}`}
              className="add-mini"
              aria-label={`Choisir les options de ${product.title}`}
            >
              <span>Options</span>
              <ChevronRight size={14} />
            </Link>
          ) : (
            <button
              className="add-mini"
              onClick={() => {
                if (added) return;
                addToCart(product);
                setAdded(true);
                import('@/lib/data/analytics').then((m) => m.trackCatalogEvent('add_to_cart', product.id));
              }}
              aria-label={`Ajouter ${product.title} au panier`}
            >
              {added ? (
                <>
                  <span style={{ color: 'var(--success)' }}>Ajouté</span>
                  <Check size={15} style={{ color: 'var(--success)' }} className="animate-fade" />
                </>
              ) : (
                <>
                  <span>Ajouter</span>
                  <Plus size={15} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
