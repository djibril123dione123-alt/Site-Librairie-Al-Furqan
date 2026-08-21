'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Heart, ArrowRight } from 'lucide-react';
import { useStore } from '@/components/providers';
import { BookCard } from '@/components/books/book-card';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import type { Product } from '@/lib/types/ui';
import { seedProducts } from '@/lib/dev/seed-products';

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
          .select(`*, product_variants(*)`)
          .in('id', ids);
          
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
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>Ma sélection</span>
      </div>
      <div className="catalogue-heading">
        <div>
          <span className="eyebrow">POUR PLUS TARD</span>
          <h1>Ma sélection</h1>
          <p>Les ouvrages que vous souhaitez retrouver plus tard.</p>
        </div>
      </div>
      {products.length ? (
        <div className="book-grid" style={{ maxWidth: 1216, margin: '0 auto', padding: '0 32px 100px' }}>
          {products.map((item) => (
            <BookCard key={item.id} product={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={34} />
          <h2>Votre sélection est vide.</h2>
          <p>Mettez de côté les ouvrages qui vous intéressent.</p>
          <Link href="/catalogue" className="button button-dark">
            Découvrir le catalogue <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </main>
  );
}
