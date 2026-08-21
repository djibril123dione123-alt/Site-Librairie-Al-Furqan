'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Minus, Plus, X, MessageCircle, Check, ShoppingBag, ArrowRight } from 'lucide-react';
import { findProduct, formatPrice, generateOrderRef, buildWhatsAppUrl, Product } from '@/lib/al-furqan-data';
import { useStore, CartLine } from '@/components/providers';
import { Cover } from '@/components/books/cover';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const [destination, setDestination] = useState('Dakar');
  const [delivery, setDelivery] = useState('À confirmer');
  
  const detailed = cart
    .map((line) => ({ line, product: findProduct(line.productId) }))
    .filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
    
  const subtotal = detailed.reduce(
    (sum, { line, product }) => sum + (line.variant?.price || product.price) * line.quantity,
    0
  );
  
  const ref = useRef(generateOrderRef());
  
  const message = `Assalāmu ʿalaykum,

je souhaite commander les ouvrages suivants depuis le site Al Furqan :

${detailed
  .map(({ line, product }, index) => {
    const lineTotal = (line.variant?.price || product.price) * line.quantity;
    const variantStr = line.variant
      ? `\n${line.variant.attributes.map((a) => `${a.label} : ${a.value}`).join('\n')}`
      : '';
    return `${index + 1} × ${product.title}${variantStr}\n— ${formatPrice(lineTotal)}`;
  })
  .join('\n\n')}

Sous-total des articles : ${formatPrice(subtotal)}

Destination : ${destination}
Mode de livraison souhaité : ${delivery}

Pouvez-vous me confirmer la disponibilité et le montant final avec la livraison ?

Référence : ${ref.current}

Merci.`;

  return (
    <main className="cart-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>Panier</span>
      </div>
      <div className="cart-heading">
        <div>
          <span className="eyebrow">VOTRE SÉLECTION</span>
          <h1>Préparer votre commande</h1>
        </div>
        <span>
          {detailed.reduce((sum, item) => sum + item.line.quantity, 0)} article{detailed.length > 1 ? 's' : ''}
        </span>
      </div>
      {detailed.length ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {detailed.map(({ line, product }, index) => (
              <div className="cart-line" key={`${line.productId}-${line.variant?.id || 'base'}`}>
                <Cover product={product} small />
                <div className="cart-line-copy">
                  <Link href={`/livres/${product.slug}`}>{product.title}</Link>
                  <span>{product.author}</span>
                  {line.variant && (
                    <small>{line.variant.attributes.map((a) => `${a.label} : ${a.value}`).join(' · ')}</small>
                  )}
                  <div className="quantity">
                    <button onClick={() => updateQuantity(index, -1)} aria-label="Diminuer la quantité">
                      <Minus size={14} />
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateQuantity(index, 1)} aria-label="Augmenter la quantité">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <strong>{formatPrice((line.variant?.price || product.price) * line.quantity)}</strong>
                <button
                  className="remove-line"
                  onClick={() => removeFromCart(index)}
                  aria-label="Retirer du panier"
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
          <aside className="cart-summary">
            <span className="eyebrow">RÉCAPITULATIF</span>
            <div className="summary-total">
              <span>Sous-total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p>Le montant de la livraison sera confirmé par Al Furqan selon votre destination.</p>
            <label>
              Destination
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option>Saint-Louis</option>
                <option>Dakar</option>
                <option>Autre région</option>
              </select>
            </label>
            <label>
              Mode de livraison
              <select value={delivery} onChange={(e) => setDelivery(e.target.value)}>
                <option>À confirmer</option>
                <option>La Poste</option>
                <option>Dem Dikk</option>
                <option>Tiak Tiak</option>
              </select>
            </label>
            <a href={buildWhatsAppUrl(message)} className="button button-dark whatsapp-button">
              <MessageCircle size={18} /> Continuer sur WhatsApp
            </a>
            <span className="summary-note">
              <Check size={15} /> La commande se finalise directement sur WhatsApp
            </span>
          </aside>
        </div>
      ) : (
        <div className="empty-state">
          <ShoppingBag size={34} />
          <h2>Votre panier est vide.</h2>
          <p>Découvrez les ouvrages Al Furqan et préparez votre prochaine commande.</p>
          <Link href="/catalogue" className="button button-dark">
            Explorer le catalogue <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </main>
  );
}
