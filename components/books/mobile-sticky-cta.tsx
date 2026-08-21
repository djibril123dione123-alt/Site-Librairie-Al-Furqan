'use client';

import { ShoppingBag, MessageCircle } from 'lucide-react';
import type { Product, Variant } from '@/lib/types/ui';
import { buildWhatsAppUrl, formatPrice } from '@/lib/al-furqan-data';
import { trackCatalogEvent } from '@/lib/data/analytics';
import { useStore } from '../providers';

export function MobileStickyCta({ product, selected }: { product: Product; selected?: Variant }) {
  const { addToCart } = useStore();
  const price = selected?.price || product.price;

  const handleAddToCart = () => {
    addToCart(product, selected);
    trackCatalogEvent('add_to_cart', product.id);
  };

  const handleRestockAlert = () => {
    trackCatalogEvent('restock_interest', product.id);
  };

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[var(--line)] z-40"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-[var(--ink)] truncate">{product.title}</div>
          <div className="text-xs font-semibold text-[var(--gold)]">{formatPrice(price)}</div>
        </div>

        {product.availability === 'Indisponible temporairement' ? (
          <a
            href={buildWhatsAppUrl(
              `Assalāmu ʿalaykum,\nje suis intéressé(e) par « ${product.title} ».\nPouvez-vous me prévenir lors du prochain arrivage ?`
            )}
            onClick={handleRestockAlert}
            className="button button-dark shadow-md text-xs py-2 px-3 flex items-center gap-1.5"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={15} /> M’alerter
          </a>
        ) : (
          <button
            className="button button-dark shadow-md text-xs py-2.5 px-4 flex items-center gap-1.5"
            onClick={handleAddToCart}
          >
            <ShoppingBag size={15} /> Ajouter
          </button>
        )}
      </div>
    </div>
  );
}
