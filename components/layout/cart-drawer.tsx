'use client';

import Link from 'next/link';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../providers';
import { findProduct, formatPrice } from '@/lib/al-furqan-data';
import { Cover } from '../books/cover';

export function CartDrawer() {
  const { cart, cartCount, cartOpen, setCartOpen } = useStore();

  if (!cartOpen) return null;

  return (
    <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-heading">
          <h2>
            Votre panier <span>{cartCount}</span>
          </h2>
          <button onClick={() => setCartOpen(false)} aria-label="Fermer le panier">
            <X />
          </button>
        </div>
        {cart.length ? (
          <>
            <div className="drawer-lines">
              {cart.map((line) => {
                const item = findProduct(line.productId);
                return item ? (
                  <div className="drawer-line" key={`${line.productId}-${line.variant?.id}`}>
                    <Cover product={item} small />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {line.quantity} × {formatPrice(line.variant?.price || item.price)}
                      </span>
                      {line.variant && (
                        <small>{line.variant.attributes.map((a) => `${a.value}`).join(' · ')}</small>
                      )}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
            <Link href="/panier" onClick={() => setCartOpen(false)} className="button button-dark drawer-cta">
              Préparer ma commande <ArrowRight size={17} />
            </Link>
          </>
        ) : (
          <div className="drawer-empty">
            <ShoppingBag size={30} />
            <p>Votre panier est vide.</p>
            <Link href="/catalogue" onClick={() => setCartOpen(false)} className="text-link">
              Découvrir le catalogue <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
