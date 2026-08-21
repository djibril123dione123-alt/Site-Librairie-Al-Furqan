'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, MessageCircle, ArrowLeft } from 'lucide-react';
import { findProduct, formatPrice, generateOrderRef, buildWhatsAppUrl, Product } from '@/lib/al-furqan-data';
import { useStore, CartLine } from '@/components/providers';
import { DeliveryForm, DeliveryMethod, LocationData, PostOffice } from '@/components/delivery/delivery-form';

export default function LivraisonPage() {
  const { cart } = useStore();
  
  const detailed = cart
    .map((line) => ({ line, product: findProduct(line.productId) }))
    .filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
    
  const subtotal = detailed.reduce(
    (sum, { line, product }) => sum + (line.variant?.price || product.price) * line.quantity,
    0
  );
  
  const ref = useRef(generateOrderRef());

  const handleValidation = ({ method, location, postOffice }: { method: DeliveryMethod, location: LocationData, postOffice?: PostOffice }) => {
    
    let deliveryText = '';
    if (method === 'la_poste') {
      deliveryText = `Retrait La Poste — ${postOffice?.name}, ${location.locality} (${location.region})`;
    } else {
      deliveryText = `Livraison Classique — ${location.locality}, ${location.region}`;
    }

    const message = `Assalāmu ʿalaykum,

je souhaite finaliser ma commande Al Furqan.

*DÉTAILS DE LA COMMANDE*
${detailed
  .map(({ line, product }, index) => {
    const lineTotal = (line.variant?.price || product.price) * line.quantity;
    const variantStr = line.variant
      ? `\n  ↳ ${line.variant.attributes.map((a) => `${a.value}`).join(' · ')}`
      : '';
    return `${index + 1} × ${product.title}${variantStr}\n  ${formatPrice(lineTotal)}`;
  })
  .join('\n')}

Sous-total : ${formatPrice(subtotal)}

*INFORMATIONS DE LIVRAISON*
Mode : ${deliveryText}

Pouvez-vous me confirmer le total exact incluant les frais de livraison pour cette destination ?

Référence : ${ref.current}`;

    // Redirect to WhatsApp
    window.location.href = buildWhatsAppUrl(message);
  };

  return (
    <main className="cart-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <Link href="/panier">Panier</Link>
        <ChevronDown size={14} />
        <span>Livraison</span>
      </div>
      
      <div className="cart-heading flex-col items-start gap-2">
        <Link href="/panier" className="text-xs text-[#b28a52] flex items-center gap-1 hover:underline mb-2">
          <ArrowLeft size={14} /> Retour au panier
        </Link>
        <span className="eyebrow">ÉTAPE 2 SUR 3</span>
        <h1 className="serif text-4xl mb-2">Informations de Livraison</h1>
        <p className="text-[#64736f] text-sm">Veuillez indiquer vos préférences pour la réception de votre commande.</p>
      </div>

      <div className="cart-layout max-w-[800px] !grid-cols-1 pt-4">
        {detailed.length === 0 ? (
          <div className="bg-[#f4ebd8] p-8 text-center rounded-xl">
            <p>Votre panier est vide. Veuillez retourner au catalogue.</p>
            <Link href="/catalogue" className="button button-dark mt-4">
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <DeliveryForm onValidSubmit={handleValidation} />
        )}
      </div>
    </main>
  );
}
