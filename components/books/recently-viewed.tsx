'use client';

import { useEffect, useState } from 'react';
import { Product, addRecentlyViewed, getRecentlyViewed } from '@/lib/al-furqan-data';
import { SectionTitle } from '../ui/section-title';
import { BookCard } from './book-card';

export function RecentlyViewed({ currentProductId }: { currentProductId: string }) {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  
  useEffect(() => {
    addRecentlyViewed(currentProductId);
    setRecentlyViewed(getRecentlyViewed().filter((p) => p.id !== currentProductId));
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
