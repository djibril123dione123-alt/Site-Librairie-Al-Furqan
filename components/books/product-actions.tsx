'use client';

import { useState } from 'react';
import { MessageCircle, ShoppingBag, Heart } from 'lucide-react';
import { Product, Variant, buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';

export function ProductActions({ product }: { product: Product }) {
  const [selected, setSelected] = useState<Variant | undefined>(product.variants?.[0]);
  const { addToCart, toggleWish, isWished } = useStore();
  const wished = isWished(product.id);
  const price = selected?.price || product.price;

  return (
    <>
      {product.variants && (
        <div className="variant-box">
          <span className="variant-label">Choisir votre édition</span>
          {Array.from(
            new Set(product.variants.flatMap((variant) => variant.attributes.map((attribute) => attribute.label)))
          ).map((label) => (
            <div className="variant-row" key={label}>
              <strong>{label}</strong>
              <div>
                {product.variants
                  ?.filter((variant) => variant.attributes.some((attribute) => attribute.label === label))
                  .map((variant) => {
                    const attribute = variant.attributes.find((item) => item.label === label);
                    return (
                      <button
                        key={variant.id}
                        className={selected?.id === variant.id ? 'selected' : ''}
                        onClick={() => setSelected(variant)}
                        aria-pressed={selected?.id === variant.id}
                      >
                        {attribute?.value}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="product-actions">
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
    </>
  );
}

