'use client';

import { useEffect } from 'react';
import { trackCatalogEvent } from '@/lib/data/analytics';

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackCatalogEvent('product_view', productId);
  }, [productId]);

  return null;
}
