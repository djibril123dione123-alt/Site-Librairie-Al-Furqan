'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../providers';
import { resolveCart } from '@/lib/cart/resolve-cart';
import type { CartResolution } from '@/lib/cart/types';

const EMPTY: CartResolution = { lines: [], loadError: false };

/**
 * Shared by /panier and CartDrawer so both always show the same validity
 * for the same cart — one query shape, one status model. `enabled` lets a
 * closed drawer skip fetching entirely (it still reflects an up-to-date
 * cartCount from context without hitting the network).
 */
export function useCartRevalidation(enabled: boolean = true) {
  const { cart } = useStore();
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState<CartResolution>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (cart.length === 0) {
      setResolution(EMPTY);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    resolveCart(cart).then((result) => {
      if (!cancelled) {
        setResolution(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, enabled, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { loading, resolution, retry };
}
