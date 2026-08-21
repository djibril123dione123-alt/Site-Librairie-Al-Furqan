'use client';

import { ShoppingBag, MessageCircle } from 'lucide-react';
import type { Product, Variant } from '@/lib/types/ui';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';

export function MobileStickyCta({ product, selected }: { product: Product, selected?: Variant }) {
  const { addToCart } = useStore();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-[#e3dcd1] z-40" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {product.availability === 'Indisponible temporairement' ? (
        <a
          href={buildWhatsAppUrl(
            `Assalāmu ʿalaykum,\nje suis intéressé(e) par « ${product.title} ».\nPouvez-vous me prévenir lors du prochain arrivage ?`
          )}
          className="button button-dark w-full shadow-lg text-sm py-3"
        >
          <MessageCircle size={18} /> M'alerter
        </a>
      ) : (
        <button 
          className="button button-dark w-full shadow-lg text-sm py-3" 
          onClick={() => addToCart(product, selected)}
        >
          <ShoppingBag size={17} /> Ajouter au panier
        </button>
      )}
    </div>
  );
}
