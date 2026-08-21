'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Minus, Plus, X, Check, ShoppingBag, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/al-furqan-data';
import { useStore, CartLine } from '@/components/providers';
import { Cover } from '@/components/books/cover';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { seedProducts } from '@/lib/dev/seed-products';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  
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

  if (loading) {
    return <div style={{ padding: '100px 32px', textAlign: 'center', color: 'var(--muted)' }}>Chargement de votre panier...</div>;
  }

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
                    <small>{line.variant.attributes.map((a: any) => `${a.label} : ${a.value}`).join(' · ')}</small>
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
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '12px 0' }}>
              Les frais et le délai de livraison sont confirmés sur WhatsApp selon votre destination.
            </p>
            
            <Link href="/livraison" className="button button-dark whatsapp-button">
              Continuer vers la livraison <ArrowRight size={18} />
            </Link>
            <span className="summary-note" style={{ marginTop: 12 }}>
              <Check size={15} /> Commande finalisée avec Al Furqan sur WhatsApp.
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
