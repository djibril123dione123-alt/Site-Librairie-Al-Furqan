'use client';

import Link from 'next/link';
import { Minus, Plus, X, AlertTriangle } from 'lucide-react';
import { Cover } from '../books/cover';
import { formatPrice } from '@/lib/al-furqan-data';
import type { ResolvedCartLine } from '@/lib/cart/types';

/**
 * One cart line, shared by /panier and CartDrawer (compact=true there).
 * Quantity is only ever editable when there's a real stock number to
 * validate against (VALID or QUANTITY_EXCEEDS_STOCK) — a removed variant
 * or an unavailable product can't be "fixed" by changing the quantity,
 * only by removing the line, so those show a static count instead.
 */
export function CartLineRow({
  resolved,
  onIncrease,
  onDecrease,
  onRemove,
  compact = false,
}: {
  resolved: ResolvedCartLine;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const { line, product, matchedVariant, unitPrice, maxStock, status, warning } = resolved;

  if (!product) {
    return (
      <div className={`cart-line cart-line-missing ${compact ? 'cart-line-compact' : ''}`}>
        <div className="cart-line-copy">
          <strong>{warning}</strong>
        </div>
        <button className="remove-line" onClick={onRemove} aria-label="Retirer cet article du panier">
          <X size={17} />
        </button>
      </div>
    );
  }

  const hasKnownAuthor = Boolean(product.author && product.author !== 'Auteur inconnu');
  const isInvalid = status !== 'VALID';
  const canAdjustQuantity = status === 'VALID' || status === 'QUANTITY_EXCEEDS_STOCK';
  const atMax = maxStock !== null && maxStock !== undefined && line.quantity >= maxStock;
  const increaseDisabled = !canAdjustQuantity || atMax;

  return (
    <div className={`cart-line ${isInvalid ? 'is-invalid' : ''} ${compact ? 'cart-line-compact' : ''}`}>
      <Link href={`/livres/${product.slug}`} className="cart-line-cover" aria-label={product.title}>
        <Cover product={product} small />
      </Link>
      <div className="cart-line-copy">
        <Link href={`/livres/${product.slug}`}>{product.title}</Link>
        {hasKnownAuthor && <span>{product.author}</span>}
        {matchedVariant && matchedVariant.attributes.length > 0 && (
          <small>{matchedVariant.attributes.map((a) => `${a.label} : ${a.value}`).join(' · ')}</small>
        )}
        {warning && (
          <span className="cart-line-warning">
            <AlertTriangle size={13} /> {warning}
          </span>
        )}

        {canAdjustQuantity ? (
          <div className="quantity">
            <button onClick={onDecrease} disabled={line.quantity <= 1} aria-label={`Diminuer la quantité de ${product.title}`}>
              <Minus size={14} />
            </button>
            <span>{line.quantity}</span>
            <button onClick={onIncrease} disabled={increaseDisabled} aria-label={`Augmenter la quantité de ${product.title}`}>
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <span className="cart-line-qty-static">Qté : {line.quantity}</span>
        )}
      </div>

      <strong className="cart-line-total">{unitPrice !== null ? formatPrice(unitPrice * line.quantity) : '—'}</strong>
      <button className="remove-line" onClick={onRemove} aria-label={`Retirer ${product.title} du panier`}>
        <X size={17} />
      </button>
    </div>
  );
}
