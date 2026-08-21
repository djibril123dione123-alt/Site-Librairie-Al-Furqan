'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, MessageCircle, ArrowLeft } from 'lucide-react';
import { formatPrice, generateOrderRef, buildWhatsAppUrl, getSiteUrl } from '@/lib/al-furqan-data';
import { useStore, CartLine } from '@/components/providers';
import { DeliveryForm, DeliveryMethod, LocationData, PostOffice } from '@/components/delivery/delivery-form';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { seedProducts } from '@/lib/dev/seed-products';

type Step = 'delivery' | 'verification';

export default function LivraisonPage() {
  const { cart } = useStore();
  
  const [step, setStep] = useState<Step>('delivery');
  const [deliveryData, setDeliveryData] = useState<{
    method: DeliveryMethod;
    location: LocationData;
    postOffice?: PostOffice;
  } | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const ref = useRef<string | null>(null);
  if (!ref.current && typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('af-order-ref');
    if (stored) {
      ref.current = stored;
    } else {
      const newRef = generateOrderRef();
      sessionStorage.setItem('af-order-ref', newRef);
      ref.current = newRef;
    }
  }

  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (cart.length === 0) {
        setLoading(false);
        return;
      }
      
      const ids = cart.map(c => c.productId);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
        const map: Record<string, Product> = {};
        ids.forEach(id => {
          const p = seedProducts.find(s => s.id === id);
          if (p) map[id] = p;
        });
        setProducts(map);
        setLoading(false);
        return;
      }

      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('products')
          .select(`*, product_variants(*)`)
          .in('id', ids);
          
        if (!error && data) {
          const map: Record<string, Product> = {};
          data.forEach(d => {
            map[d.id] = dbProductToUi(d, supabaseUrl);
          });
          setProducts(map);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [cart]);
  
  const detailed = cart
    .map((line) => ({ line, product: products[line.productId] }))
    .filter((item): item is { line: CartLine; product: Product } => Boolean(item.product));
    
  const subtotal = detailed.reduce(
    (sum, { line, product }) => sum + (line.variant?.price || product.price) * line.quantity,
    0
  );

  const handleDeliverySubmit = (data: { method: DeliveryMethod, location: LocationData, postOffice?: PostOffice }) => {
    setDeliveryData(data);
    setStep('verification');
  };

  const handleFinalSubmit = () => {
    if (!deliveryData || !name || !phone) return;

    const baseUrl = getSiteUrl();

    let deliveryText = '';
    if (deliveryData.method === 'la_poste') {
      deliveryText = `Mode : La Poste Sénégal\nRégion : ${deliveryData.location.region}${deliveryData.location.department ? `\nDépartement : ${deliveryData.location.department}` : ''}${deliveryData.location.commune ? `\nCommune : ${deliveryData.location.commune}` : ''}\nLocalité : ${deliveryData.location.locality}\nBureau retenu : ${deliveryData.postOffice?.name}`;
    } else {
      deliveryText = `Mode : Livraison à une adresse\nRégion : ${deliveryData.location.region}${deliveryData.location.department ? `\nDépartement : ${deliveryData.location.department}` : ''}${deliveryData.location.commune ? `\nCommune : ${deliveryData.location.commune}` : ''}\nLocalité : ${deliveryData.location.locality}\nQuartier / Rue : ${deliveryData.location.quartier || 'Non précisé'}${deliveryData.location.repere ? `\nRepère : ${deliveryData.location.repere}` : ''}`;
    }

    const message = `Assalāmu ʿalaykum,
je souhaite finaliser ma commande Al Furqan.

*DÉTAILS DE LA COMMANDE*
${detailed
  .map(({ line, product }, index) => {
    const lineTotal = (line.variant?.price || product.price) * line.quantity;
    const skuStr = line.variant?.sku ? ` (SKU: ${line.variant.sku})` : '';
    const variantStr = line.variant
      ? `\n  ↳ ${line.variant.attributes.map((a: any) => `${a.label || 'Option'} : ${a.value}`).join(' · ')}${skuStr}`
      : '';
    const productUrl = `${baseUrl}/livres/${product.slug}`;
    return `${index + 1} × ${product.title}${variantStr}\n  Prix : ${formatPrice(lineTotal)}\n  Lien : ${productUrl}`;
  })
  .join('\n\n')}

Sous-total livres : ${formatPrice(subtotal)}
Frais de livraison : à confirmer avec Al Furqan

*INFORMATIONS DE LIVRAISON*
${deliveryText}

*COORDONNÉES CLIENT*
Nom : ${name}
Téléphone : ${phone}

Référence commande : ${ref.current}`;

    window.location.href = buildWhatsAppUrl(message);
  };

  if (loading) {
    return <div style={{ padding: '100px 32px', textAlign: 'center', color: 'var(--muted)' }}>Chargement de la commande...</div>;
  }

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
        {step === 'delivery' ? (
          <Link href="/panier" className="text-xs text-[#b28a52] flex items-center gap-1 hover:underline mb-2">
            <ArrowLeft size={14} /> Retour au panier
          </Link>
        ) : (
          <button onClick={() => setStep('delivery')} className="text-xs text-[#b28a52] flex items-center gap-1 hover:underline mb-2">
            <ArrowLeft size={14} /> Modifier la livraison
          </button>
        )}
        <span className="eyebrow">ÉTAPE {step === 'delivery' ? '2' : '3'} SUR 3</span>
        <h1 className="serif text-4xl mb-2">{step === 'delivery' ? 'Informations de Livraison' : 'Vérification'}</h1>
        <p className="text-[#64736f] text-sm">
          {step === 'delivery' 
            ? 'Veuillez indiquer vos préférences pour la réception de votre commande.' 
            : 'Vérifiez vos informations avant de confirmer.'}
        </p>
      </div>

      <div className="cart-layout max-w-[800px] !grid-cols-1 pt-4">
        {detailed.length === 0 ? (
          <div className="bg-[#f4ebd8] p-8 text-center rounded-xl">
            <p>Votre panier est vide. Veuillez retourner au catalogue.</p>
            <Link href="/catalogue" className="button button-dark mt-4">
              Explorer le catalogue
            </Link>
          </div>
        ) : step === 'delivery' ? (
          <DeliveryForm 
            onValidSubmit={handleDeliverySubmit} 
            initialData={
              deliveryData || 
              (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('af-delivery-draft')
                ? JSON.parse(sessionStorage.getItem('af-delivery-draft')!)
                : undefined)
            }
          />
        ) : (
          <div className="verification-step animate-in fade-in">
            <div className="bg-[#fbf9f4] border border-[#e3dcd1] rounded-xl p-6 mb-6">
              <h3 className="serif text-xl font-medium mb-4">Votre commande</h3>
              <div className="space-y-3 mb-4 border-b border-[#e3dcd1] pb-4">
                {detailed.map(({ line, product }, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{line.quantity} × {product.title}</span>
                      {line.variant && <div className="text-xs text-[#64736f] mt-1">{line.variant.attributes.map((a: any) => `${a.label || 'Option'} : ${a.value}`).join(' · ')}</div>}
                    </div>
                    <span className="font-medium">{formatPrice((line.variant?.price || product.price) * line.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="serif">Sous-total livres</span>
                <span className="font-medium text-[#b28a52]">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <div className="bg-[#fbf9f4] border border-[#e3dcd1] rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="serif text-xl font-medium">Livraison</h3>
                <button onClick={() => setStep('delivery')} className="text-xs text-[#b28a52] underline">Modifier</button>
              </div>
              <div className="text-sm space-y-1 text-[#64736f]">
                {deliveryData?.method === 'la_poste' ? (
                  <>
                    <p><strong className="text-black">Mode :</strong> La Poste</p>
                    <p><strong className="text-black">Bureau :</strong> {deliveryData.postOffice?.name}</p>
                    <p><strong className="text-black">Adresse :</strong> {deliveryData.postOffice?.address}</p>
                  </>
                ) : (
                  <>
                    <p><strong className="text-black">Mode :</strong> Livraison à une adresse</p>
                    <p><strong className="text-black">Localité :</strong> {deliveryData?.location.locality} ({deliveryData?.location.region})</p>
                    <p><strong className="text-black">Quartier :</strong> {deliveryData?.location.quartier}</p>
                    {deliveryData?.location.repere && <p><strong className="text-black">Repère :</strong> {deliveryData.location.repere}</p>}
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#fbf9f4] border border-[#e3dcd1] rounded-xl p-6 mb-8">
              <h3 className="serif text-xl font-medium mb-4">Vos coordonnées</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label className="block text-xs uppercase tracking-widest text-[#b28a52] mb-2">Prénom & Nom</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Oumar Ndiaye"
                    className="w-full border border-[#e3dcd1] bg-white p-3 rounded-md"
                  />
                </div>
                <div className="input-group">
                  <label className="block text-xs uppercase tracking-widest text-[#b28a52] mb-2">Téléphone</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 77 123 45 67"
                    className="w-full border border-[#e3dcd1] bg-white p-3 rounded-md"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleFinalSubmit}
              disabled={!name || !phone}
              className="button button-dark w-full py-4 text-base disabled:opacity-50"
            >
              <MessageCircle size={18} /> Commander sur WhatsApp
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
