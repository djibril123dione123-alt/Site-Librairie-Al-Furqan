'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { useStore } from '@/components/providers';
import { BookCard } from '@/components/books/book-card';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { seedProducts } from '@/lib/dev/seed-products';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { AccountNudge } from '@/components/account/account-nudge';

export default function SelectionPage() {
  const { wishlist } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (wishlist.size === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      
      const ids = Array.from(wishlist);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
        // Fallback seed
        const matched = seedProducts.filter(s => ids.includes(s.id));
        setProducts(matched as unknown as Product[]);
        setLoading(false);
        return;
      }

      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('products')
          .select(`*, authors(*), publishers(*), categories(*), product_images(*), product_variants(*)`)
          .in('id', ids)
          .eq('status', 'published');
          
        if (!error && data) {
          setProducts(data.map(d => dbProductToUi(d, supabaseUrl)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [wishlist]);

  if (loading) {
    return <div style={{ padding: '100px 32px', textAlign: 'center' }}>Chargement de votre sélection...</div>;
  }
  
  return (
    <main className="catalogue-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Ma sélection' }]} />
      <div className="catalogue-heading">
        <div>
          <span className="eyebrow">POUR PLUS TARD</span>
          <h1>Ma sélection</h1>
          <p>Les ouvrages que vous souhaitez retrouver plus tard.</p>
        </div>
      </div>
      {products.length > 0 && (
        <AccountNudge
          title="Retrouvez vos favoris plus tard"
          body="Créez ou ouvrez votre compte pour conserver cette sélection sur tous vos appareils."
          ctaLabel="Sauvegarder ma sélection"
          secondaryLabel="Continuer sans compte"
        />
      )}
      {products.length ? (
        <div className="book-grid selection-grid">
          {products.map((item) => (
            <BookCard key={item.id} product={item} />
          ))}
        </div>
      ) : (
        <EmptyState mark={<Heart size={22} />} title="Votre sélection est vide." body="Mettez de côté les ouvrages qui vous intéressent.">
          <Link href="/catalogue" className="button button-dark">
            Découvrir le catalogue <ArrowRight size={17} />
          </Link>
        </EmptyState>
      )}
    </main>
  );
}
