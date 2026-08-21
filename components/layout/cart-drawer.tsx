'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../providers';
import { formatPrice } from '@/lib/al-furqan-data';
import { Cover } from '../books/cover';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { seedProducts } from '@/lib/dev/seed-products';

export function CartDrawer() {
  const { cart, cartCount, cartOpen, setCartOpen } = useStore();
  const [products, setProducts] = useState<Record<string, Product>>({});
  
  useEffect(() => {
    async function loadProducts() {
      if (cart.length === 0 || !cartOpen) return;
      
      const ids = cart.map(c => c.productId);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
        const map: Record<string, Product> = {};
        ids.forEach(id => {
          const p = seedProducts.find(s => s.id === id);
          if (p) map[id] = p as unknown as Product;
        });
        setProducts(map);
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
      }
    }
    loadProducts();
  }, [cart, cartOpen]);

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
                const item = products[line.productId];
                return item ? (
                  <div className="drawer-line" key={`${line.productId}-${line.variant?.id}`}>
                    <Cover product={item} small />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {line.quantity} × {formatPrice(line.variant?.price || item.price)}
                      </span>
                      {line.variant && (
                        <small>{line.variant.attributes.map((a: any) => `${a.value}`).join(' · ')}</small>
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
