import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/al-furqan-data';

export function CartSummary({ subtotal, hasInvalidLines }: { subtotal: number; hasInvalidLines: boolean }) {
  return (
    <aside className="cart-summary">
      <span className="eyebrow">Récapitulatif</span>
      <div className="summary-total">
        <span>Sous-total</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>
      <p className="cart-summary-note">
        Les frais et le délai de livraison sont confirmés selon votre destination.
      </p>
      {hasInvalidLines ? (
        <p className="cart-summary-blocked">Corrigez les articles signalés avant de poursuivre.</p>
      ) : (
        <Link href="/livraison" className="button button-dark cart-summary-cta">
          Continuer vers la livraison <ArrowRight size={18} />
        </Link>
      )}
      <Link href="/catalogue" className="text-link cart-summary-secondary">
        Continuer mes achats
      </Link>
    </aside>
  );
}
