'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types/ui';
import { addRecentlyViewed } from '@/lib/al-furqan-data';
import { SectionTitle } from '../ui/section-title';
import { BookCard } from './book-card';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import { seedProducts } from '@/lib/dev/seed-products';

export function RecentlyViewed({ currentProductId }: { currentProductId: string }) {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  
  useEffect(() => {
    addRecentlyViewed(currentProductId);
    
    async function loadRecent() {
      try {
        const stored = window.localStorage.getItem('af-recent');
        if (!stored) return;
        const ids: string[] = JSON.parse(stored).filter((id: string) => id !== currentProductId);
        if (ids.length === 0) return;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          const matched = seedProducts.filter(s => ids.includes(s.id)) as unknown as Product[];
          setRecentlyViewed(matched);
          return;
        }

        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('products')
          .select(`*, authors(*), publishers(*), categories(*), product_images(*), product_variants(*)`)
          .in('id', ids)
          .eq('status', 'published');
          
        if (!error && data) {
          // Keep order of ids
          const map: Record<string, Product> = {};
          data.forEach(d => {
            map[d.id] = dbProductToUi(d, supabaseUrl);
          });
          const ordered = ids.map(id => map[id]).filter(Boolean);
          setRecentlyViewed(ordered.slice(0, 4));
        }
      } catch (err) {
        // ignore
      }
    }
    loadRecent();
  }, [currentProductId]);

  if (recentlyViewed.length === 0) return null;

  return (
    <section className="products-section related">
      <SectionTitle eyebrow="VOS CONSULTATIONS" title="Consultés récemment" />
      <div className="book-grid">
        {recentlyViewed.map((item) => (
          <BookCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
}
