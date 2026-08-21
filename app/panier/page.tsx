'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Minus, Plus, X, ShoppingBag, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/al-furqan-data';
import { useStore, CartLine } from '@/components/providers';
import { Cover } from '@/components/books/cover';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { seedProducts } from '@/lib/dev/seed-products';

interface RevalidatedLine {
  line: CartLine;
  product?: Product;
  isAvailable: boolean;
  maxStock?: number | null;
  warning?: string;
}

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const [revalidated, setRevalidated] = useState<RevalidatedLine[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadAndRevalidate() {
      if (cart.length === 0) {
        setRevalidated([]);
        setLoading(false);
        return;
      }
      
      const ids = Array.from(new Set(cart.map((c) => c.productId)));
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!supabaseUrl) {
        // Fallback seed validation
        const map: Record<string, Product> = {};
        ids.forEach((id) => {
          const p = seedProducts.find((s) => s.id === id);
          if (p) map[id] = p;
        });

        const lines: RevalidatedLine[] = cart.map((line) => {
          const p = map[line.productId];
          if (!p) return { line, isAvailable: false, warning: 'Ouvrage indisponible' };

          const isAvail = p.availability !== 'Indisponible temporairement';
          const matchedVar = line.variant ? p.variants?.find((v) => v.id === line.variant!.id) : undefined;
          const maxStock = matchedVar ? matchedVar.stock : p.stockQuantity ?? null;
          let warning: string | undefined;

          if (!isAvail) warning = 'Ouvrage temporairement indisponible';
          else if (line.variant && !matchedVar) warning = 'Option de variante non disponible';
          else if (maxStock !== null && maxStock !== undefined && line.quantity > maxStock) {
            warning = `Stock disponible : ${maxStock}`;
          }

          return { line, product: p, isAvailable: isAvail && (!line.variant || Boolean(matchedVar)), maxStock, warning };
        });

        setRevalidated(lines);
        setLoading(false);
        return;
      }

      try {
        const supabase = createBrowserClient();
        const { data } = await supabase
          .from('products')
          .select(`*, authors(*), publishers(*), categories(*), product_variants(*), product_images(*)`)
          .in('id', ids)
          .eq('status', 'published');
          
        const map: Record<string, Product> = {};
        if (data) {
          data.forEach((d) => {
            map[d.id] = dbProductToUi(d as any, supabaseUrl);
          });
        }

        const lines: RevalidatedLine[] = cart.map((line) => {
          const p = map[line.productId];
          if (!p) {
            return { line, isAvailable: false, warning: 'Cet ouvrage n’est plus disponible à la vente.' };
          }

          const isAvail = p.availability !== 'Indisponible temporairement';
          const matchedVar = line.variant ? p.variants?.find((v) => v.id === line.variant!.id) : undefined;
          const maxStock = matchedVar ? matchedVar.stock : p.stockQuantity ?? null;
          let warning: string | undefined;

          if (!isAvail) warning = 'Cet ouvrage est temporairement indisponible.';
          else if (line.variant && !matchedVar) warning = 'La variante sélectionnée n’existe plus.';
          else if (maxStock !== null && maxStock !== undefined && maxStock > 0 && line.quantity > maxStock) {
            warning = `Quantité réajustée (stock max disponible : ${maxStock}).`;
          } else if (maxStock === 0) {
            warning = 'Cet ouvrage est actuellement en rupture de stock.';
          }

          return {
            line,
            product: p,
            isAvailable: isAvail && (!line.variant || Boolean(matchedVar)) && (maxStock === null || maxStock > 0),
            maxStock,
            warning,
          };
        });

        setRevalidated(lines);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAndRevalidate();
  }, [cart]);

  const validLines = revalidated.filter((item) => item.product && item.isAvailable);
  const hasInvalidLines = revalidated.some((item) => !item.isAvailable);

  const subtotal = validLines.reduce((sum, { line, product }) => {
    const matchedVar = line.variant ? product!.variants?.find((v) => v.id === line.variant!.id) : undefined;
    const price = matchedVar?.price || line.variant?.price || product!.price;
    return sum + price * line.quantity;
  }, 0);

  if (loading) {
    return <div style={{ padding: '100px 32px', textAlign: 'center', color: 'var(--muted)' }}>Vérification du panier et des stocks...</div>;
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
          {cart.reduce((sum, item) => sum + item.quantity, 0)} article{cart.length > 1 ? 's' : ''}
        </span>
      </div>

      {revalidated.length ? (
        <div className="cart-layout">
          <div className="cart-lines">
            {revalidated.map(({ line, product, isAvailable, maxStock, warning }, index) => {
              if (!product) {
                return (
                  <div className="cart-line opacity-60 bg-red-50 p-4 rounded-lg" key={index}>
                    <div style={{ flex: 1 }}>
                      <strong className="text-red-700">{warning || 'Ouvrage indisponible'}</strong>
                      <p className="text-xs text-red-600 mt-1">Cet article a été retiré du catalogue.</p>
                    </div>
                    <button className="remove-line" onClick={() => removeFromCart(index)} aria-label="Retirer">
                      <X size={17} />
                    </button>
                  </div>
                );
              }

              const matchedVar = line.variant ? product.variants?.find((v) => v.id === line.variant!.id) : undefined;
              const price = matchedVar?.price || line.variant?.price || product.price;

              return (
                <div className={`cart-line ${!isAvailable ? 'opacity-70 bg-amber-50/50' : ''}`} key={`${line.productId}-${line.variant?.id || 'base'}`}>
                  <Cover product={product} small />
                  <div className="cart-line-copy">
                    <Link href={`/livres/${product.slug}`}>{product.title}</Link>
                    <span>{product.author}</span>
                    {line.variant && (
                      <small>{line.variant.attributes.map((a: any) => `${a.label || 'Option'} : ${a.value}`).join(' · ')}</small>
                    )}

                    {warning && (
                      <div style={{ color: '#b45309', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <AlertTriangle size={13} /> {warning}
                      </div>
                    )}

                    <div className="quantity">
                      <button onClick={() => updateQuantity(index, -1)} aria-label="Diminuer la quantité">
                        <Minus size={14} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        onClick={() => {
                          if (maxStock !== null && maxStock !== undefined && line.quantity >= maxStock) {
                            return;
                          }
                          updateQuantity(index, 1);
                        }}
                        disabled={maxStock !== null && maxStock !== undefined && line.quantity >= maxStock}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <strong>{formatPrice(price * line.quantity)}</strong>
                  <button className="remove-line" onClick={() => removeFromCart(index)} aria-label="Retirer du panier">
                    <X size={17} />
                  </button>
                </div>
              );
            })}
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

            {hasInvalidLines ? (
              <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>
                Veuillez retirer ou corriger les articles indisponibles avant de poursuivre.
              </div>
            ) : (
              <Link href="/livraison" className="button button-dark whatsapp-button">
                Continuer vers la livraison <ArrowRight size={18} />
              </Link>
            )}
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
