'use client';

import { Heart } from 'lucide-react';
import { useStore } from '../providers';

/**
 * Physical presentation only — reads/writes the wishlist store but knows
 * nothing about cart, delivery or catalogue layout. Reusable outside
 * BookStage (e.g. a future PDP action row) without dragging card markup.
 */
export function WishlistButton({ productId, title }: { productId: string; title: string }) {
  const { toggleWish, isWished } = useStore();
  const wished = isWished(productId);

  return (
    <button
      type="button"
      className={`wish-button ${wished ? 'is-wished' : ''}`}
      onClick={() => toggleWish(productId)}
      aria-label={wished ? `Retirer ${title} de ma sélection` : `Ajouter ${title} à ma sélection`}
      aria-pressed={wished}
    >
      <Heart size={18} fill={wished ? 'currentColor' : 'none'} className="wish-icon" />
    </button>
  );
}
