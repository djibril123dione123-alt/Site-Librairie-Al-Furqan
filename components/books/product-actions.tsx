'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, ShoppingBag, Heart, Check } from 'lucide-react';
import type { Product, Variant } from '@/lib/types/ui';
import { buildWhatsAppUrl, formatPrice } from '@/lib/al-furqan-data';
import { useStore } from '../providers';
import { VariantSelector } from './variant-selector';
import { StockBadge } from './stock-badge';
import { ProductTrustStrip } from './product-trust-strip';
import { MobileStickyCta } from './mobile-sticky-cta';
import { WhatsAppLink } from './whatsapp-link';

/**
 * The full purchase panel: price, availability, variant choice, primary CTA,
 * wishlist, delivery trust and the WhatsApp secondary action. Built with
 * spacing/alignment only — no wrapping "card" surface.
 */
export function ProductActions({ product }: { product: Product }) {
  const [selected, setSelected] = useState<Variant | undefined>(product.variants?.[0]);
  const [added, setAdded] = useState(false);
  const { addToCart, toggleWish, isWished } = useStore();
  const wished = isWished(product.id);
  const price = selected?.price || product.price;
  const isUnavailable = product.availability === 'Indisponible temporairement';

  useEffect(() => {
    if (added) {
      const timer = setTimeout(() => setAdded(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [added]);

  return (
    <div className="pdp-purchase">
      <div className="pdp-price">{formatPrice(price)}</div>
      <StockBadge availability={product.availability} />

      <VariantSelector product={product} selected={selected} onChange={setSelected} />

      <div className="pdp-purchase-actions hidden md:flex">
        {isUnavailable ? (
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
          aria-label={wished ? `Retirer ${product.title} de ma sélection` : `Ajouter ${product.title} à ma sélection`}
        >
          <Heart size={18} fill={wished ? 'currentColor' : 'none'} className="wish-icon" />
          {wished ? 'Dans ma sélection' : 'Ma sélection'}
        </button>
      </div>

      <ProductTrustStrip />

      <div className="whatsapp-product">
        <MessageCircle size={17} />
        <span>
          Une question sur cette édition ?{' '}
          <WhatsAppLink
            href={buildWhatsAppUrl(`Assalāmu ʿalaykum,\nje souhaite des informations sur « ${product.title} ».`)}
            productId={product.id}
          >
            Écrire sur WhatsApp
          </WhatsAppLink>
        </span>
      </div>

      {/* Mobile sticky CTA */}
      <MobileStickyCta product={product} selected={selected} />
    </div>
  );
}
