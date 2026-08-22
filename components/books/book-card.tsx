'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Check } from 'lucide-react';
import type { Product } from '@/lib/types/ui';
import { formatPrice } from '@/lib/al-furqan-data';
import { BookStage } from './book-stage';
import { WishlistButton } from './wishlist-button';
import { useStore } from '../providers';

export function BookCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const { addToCart } = useStore();

  const unavailable = product.availability === 'Indisponible temporairement';
  const lowStock = product.availability === 'Derniers exemplaires';
  const restocked = product.availability === 'De retour en stock';
  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  // "Auteur inconnu" is a data-layer placeholder (see lib/types/mappers.ts), not a
  // real credit — never present it to the reader as if it were verified information.
  const hasKnownAuthor = Boolean(product.author && product.author !== 'Auteur inconnu');

  useEffect(() => {
    if (added) {
      const timer = setTimeout(() => setAdded(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [added]);

  return (
    <article className="book-card">
      <div className="book-stage">
        <Link href={`/livres/${product.slug}`} aria-label={`Voir la fiche de ${product.title}`}>
          <BookStage product={product} interactive />
        </Link>
        <WishlistButton productId={product.id} title={product.title} />
      </div>
      <div className="book-copy">
        <span className="book-category">{product.category}</span>
        <Link href={`/livres/${product.slug}`} className="book-title">
          {product.title}
        </Link>
        {hasKnownAuthor && <span className="book-author">{product.author}</span>}
        {lowStock && <span className="stock-low-text">Derniers exemplaires</span>}
        {restocked && <span className="stock-restocked-text">De retour en stock</span>}
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
