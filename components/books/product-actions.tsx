'use client';

import { useState } from 'react';
import { MessageCircle, ShoppingBag, Heart } from 'lucide-react';
import { Product, Variant, buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';
import { VariantSelector } from './variant-selector';
import { MobileStickyCta } from './mobile-sticky-cta';

export function ProductActions({ product }: { product: Product }) {
  const [selected, setSelected] = useState<Variant | undefined>(product.variants?.[0]);
  const { addToCart, toggleWish, isWished } = useStore();
  const wished = isWished(product.id);
  const price = selected?.price || product.price;

  return (
    <>
      <VariantSelector product={product} selected={selected} onChange={setSelected} />
      
      {/* Desktop/Tablet Actions */}
      <div className="product-actions hidden md:flex">
        {product.availability === 'Indisponible temporairement' ? (
          <a
            href={buildWhatsAppUrl(
              `Assalāmu ʿalaykum,\nje suis intéressé(e) par « ${product.title} ».\nPouvez-vous me prévenir lors du prochain arrivage ?`
            )}
            className="button button-dark"
          >
            <MessageCircle size={18} /> Je suis intéressé(e)
          </a>
        ) : (
          <button className="button button-dark" onClick={() => addToCart(product, selected)}>
            <ShoppingBag size={17} /> Ajouter au panier
          </button>
        )}
        <button
          className={`wish-large ${wished ? 'is-wished' : ''}`}
          onClick={() => toggleWish(product.id)}
          aria-pressed={wished}
        >
          <Heart size={18} fill={wished ? 'currentColor' : 'none'} />{' '}
          {wished ? 'Dans ma sélection' : 'Ma sélection'}
        </button>
      </div>

      {/* Mobile Sticky CTA */}
      <MobileStickyCta product={product} selected={selected} />
    </>
  );
}

