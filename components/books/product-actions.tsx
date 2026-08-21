'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, ShoppingBag, Heart, Check } from 'lucide-react';
import type { Product, Variant } from '@/lib/types/ui';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';
import { VariantSelector } from './variant-selector';
import { MobileStickyCta } from './mobile-sticky-cta';
import { WhatsAppLink } from './whatsapp-link';

export function ProductActions({ product }: { product: Product }) {
  const [selected, setSelected] = useState<Variant | undefined>(product.variants?.[0]);
  const [added, setAdded] = useState(false);
  const { addToCart, toggleWish, isWished } = useStore();
  const wished = isWished(product.id);
  const price = selected?.price || product.price;

  useEffect(() => {
    if (added) {
      const timer = setTimeout(() => setAdded(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [added]);

  return (
    <>
      <VariantSelector product={product} selected={selected} onChange={setSelected} />
      
      {/* Desktop/Tablet Actions */}
      <div className="product-actions hidden md:flex">
        {product.availability === 'Indisponible temporairement' ? (
          <WhatsAppLink
            href={buildWhatsAppUrl(
              `Assalāmu ʿalaykum,\nje suis intéressé(e) par « ${product.title} ».\nPouvez-vous me prévenir lors du prochain arrivage ?`
            )}
            productId={product.id}
            className="button button-dark"
          >
            <MessageCircle size={18} /> Je suis intéressé(e)
          </WhatsAppLink>
        ) : (
          <button
            className={`button ${added ? 'button-dark is-success' : 'button-dark'}`}
            onClick={() => {
              if (added) return;
              addToCart(product, selected);
              setAdded(true);
              import('@/lib/data/analytics').then((m) => m.trackCatalogEvent('add_to_cart', product.id));
            }}
          >
            {added ? (
              <><Check size={17} className="animate-fade" /> Ajouté au panier</>
            ) : (
              <><ShoppingBag size={17} /> Ajouter au panier</>
            )}
          </button>
        )}
        <button
          className={`wish-large ${wished ? 'is-wished' : ''}`}
          onClick={() => toggleWish(product.id)}
          aria-pressed={wished}
        >
          <Heart size={18} fill={wished ? 'currentColor' : 'none'} className="wish-icon" style={{ transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }} />{' '}
          {wished ? 'Dans ma sélection' : 'Ma sélection'}
        </button>
      </div>

      {/* Mobile Sticky CTA */}
      <MobileStickyCta product={product} selected={selected} />
    </>
  );
}

