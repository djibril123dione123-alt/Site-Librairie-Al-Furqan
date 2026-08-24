'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '@/components/providers';
import { useCartRevalidation } from '@/components/cart/use-cart-revalidation';
import { CartLineRow } from '@/components/cart/cart-line-row';
import { CartLinesSkeleton } from '@/components/cart/cart-line-skeleton';
import { CartSummary } from '@/components/cart/cart-summary';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { AccountNudge } from '@/components/account/account-nudge';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const { loading, resolution, retry } = useCartRevalidation();
  const { lines, loadError } = resolution;

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const validLines = lines.filter((l) => l.status === 'VALID');
  const hasInvalidLines = lines.some((l) => l.status !== 'VALID');
  const subtotal = validLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);

  return (
    <main className="cart-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Panier' }]} />

      <div className="cart-heading">
        <div>
          <span className="eyebrow">VOTRE SÉLECTION</span>
          <h1>Préparer votre commande</h1>
        </div>
        {cart.length > 0 && (
          <span>
            {totalQuantity} article{totalQuantity > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {cart.length === 0 ? (
        <EmptyState mark={<ShoppingBag size={22} />} title="Votre panier est vide." body="Découvrez les ouvrages Al Furqan et préparez votre prochaine commande.">
          <Link href="/catalogue" className="button button-dark">
            Explorer le catalogue <ArrowRight size={17} />
          </Link>
        </EmptyState>
      ) : loading ? (
        <div className="cart-layout">
          <div className="cart-lines">
            <CartLinesSkeleton count={Math.min(cart.length, 3)} />
          </div>
        </div>
      ) : loadError ? (
        <EmptyState
          mark="!"
          title="Impossible de vérifier votre panier"
          body="Une erreur réseau nous a empêchés de vérifier la disponibilité de vos ouvrages. Réessayez dans un instant."
        >
          <button className="button button-dark" onClick={retry}>
            Réessayer
          </button>
          <Link href="/catalogue" className="text-link">
            Retour au catalogue
          </Link>
        </EmptyState>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {lines.map((resolved) => (
              <CartLineRow
                key={`${resolved.line.productId}-${resolved.line.variant?.id || 'base'}-${resolved.cartIndex}`}
                resolved={resolved}
                onIncrease={() => updateQuantity(resolved.cartIndex, 1)}
                onDecrease={() => updateQuantity(resolved.cartIndex, -1)}
                onRemove={() => removeFromCart(resolved.cartIndex)}
              />
            ))}
            <AccountNudge
              title="Gardez votre panier pour plus tard"
              body="Connectez-vous pour le retrouver sur un autre appareil."
              ctaLabel="Sauvegarder mon panier"
            />
          </div>
          <CartSummary subtotal={subtotal} hasInvalidLines={hasInvalidLines} />
        </div>
      )}
    </main>
  );
}
