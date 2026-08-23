'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../providers';
import { useCartRevalidation } from '../cart/use-cart-revalidation';
import { CartLineRow } from '../cart/cart-line-row';
import { CartLinesSkeleton } from '../cart/cart-line-skeleton';
import { EmptyState } from '../ui/empty-state';
import { formatPrice } from '@/lib/al-furqan-data';

export function CartDrawer() {
  const { cart, cartCount, cartOpen, setCartOpen, updateQuantity, removeFromCart } = useStore();
  const { loading, resolution } = useCartRevalidation(cartOpen);
  const { lines, loadError } = resolution;

  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Real dialog semantics: focus in on open, trap Tab, Escape closes, focus
  // restores to whatever opened it, background scroll locked — same pattern
  // as the catalogue's mobile filter drawer.
  useEffect(() => {
    if (!cartOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    drawerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false);
      } else if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      previouslyFocused.current?.focus();
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  const validLines = lines.filter((l) => l.status === 'VALID');
  const hasInvalidLines = lines.some((l) => l.status !== 'VALID');
  const subtotal = validLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);

  return (
    <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-heading">
          <h2 id="cart-drawer-heading">
            Votre panier <span>{cartCount}</span>
          </h2>
          <button onClick={() => setCartOpen(false)} aria-label="Fermer le panier" data-autofocus>
            <X />
          </button>
        </div>

        {cart.length === 0 ? (
          <EmptyState mark={<ShoppingBag size={20} />} title="Votre panier est vide." body="Découvrez les ouvrages Al Furqan.">
            <Link href="/catalogue" onClick={() => setCartOpen(false)} className="text-link">
              Découvrir le catalogue <ArrowRight size={15} />
            </Link>
          </EmptyState>
        ) : loading ? (
          <div className="drawer-lines">
            <CartLinesSkeleton count={Math.min(cart.length, 2)} compact />
          </div>
        ) : loadError ? (
          <div className="drawer-error">
            <p>Nous n&apos;avons pas pu vérifier votre panier pour le moment.</p>
            <Link href="/panier" onClick={() => setCartOpen(false)} className="button button-dark">
              Voir mon panier
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-lines">
              {lines.map((resolved) => (
                <CartLineRow
                  key={`${resolved.line.productId}-${resolved.line.variant?.id || 'base'}-${resolved.cartIndex}`}
                  resolved={resolved}
                  onIncrease={() => updateQuantity(resolved.cartIndex, 1)}
                  onDecrease={() => updateQuantity(resolved.cartIndex, -1)}
                  onRemove={() => removeFromCart(resolved.cartIndex)}
                  compact
                />
              ))}
            </div>

            <div className="drawer-summary">
              <div className="summary-total">
                <span>Sous-total</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              {hasInvalidLines && (
                <p className="cart-summary-blocked">Vérifiez les articles signalés dans votre panier.</p>
              )}
              <Link href="/panier" onClick={() => setCartOpen(false)} className="button button-dark drawer-cta">
                Préparer ma commande <ArrowRight size={17} />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
