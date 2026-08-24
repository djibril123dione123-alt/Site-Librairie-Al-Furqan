'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Product, Variant } from '@/lib/types/ui';
import { useCustomerSession } from '@/components/auth/customer-session-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { getLineKey } from '@/lib/cart/identity';
import {
  fetchCloudCart,
  fetchCloudWishlist,
  mergeCartLines,
  mergeWishlists,
  reconcileCloudCart,
  reconcileCloudWishlist,
} from '@/lib/supabase/customer';

export type CartLine = {
  productId: string;
  quantity: number;
  variant?: Variant;
  // Cloud-persisted lines (Phase J) carry only this — the cloud store keeps
  // intent (product + variant id + quantity), never a price/stock snapshot.
  // Legacy `af-cart` localStorage lines have `variant` but not this; use
  // lib/cart/identity.ts's getVariantId() rather than reading either field
  // directly.
  variantId?: string;
};

type CloudSyncStatus = 'idle' | 'syncing' | 'error';

type StoreContextType = {
  cart: CartLine[];
  cartCount: number;
  addToCart: (product: Product, variant?: Variant) => void;
  updateQuantity: (index: number, delta: number) => void;
  removeFromCart: (index: number) => void;
  wishlist: Set<string>;
  wishlistCount: number;
  toggleWish: (id: string) => void;
  isWished: (id: string) => boolean;
  toast: string;
  clearToast: () => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  /** True while the one-time post-login cloud merge is in flight — the only
   *  moment worth showing "Synchronisation..." (Phase J §54). */
  cloudSyncing: boolean;
  /** Reflects the latest per-mutation cloud persistence attempt while
   *  authenticated. 'error' means a change is only local for now — never
   *  claim "Synchronisé" in that state (Phase J §32). */
  syncStatus: CloudSyncStatus;
};

const StoreContext = createContext<StoreContextType | null>(null);

type CloudPhase = 'idle' | 'syncing' | 'ready' | 'error';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;
  const { user, authReady, isAuthenticated } = useCustomerSession();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [localReady, setLocalReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [cloudPhase, setCloudPhase] = useState<CloudPhase>('idle');
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');

  // Refs so effects always see the latest guest state without re-running on
  // every keystroke-level state change, and so the merge effect isn't
  // fighting a stale closure over `cart`/`wishlist` from when it mounted.
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const wishlistRef = useRef(wishlist);
  wishlistRef.current = wishlist;

  const cloudSyncedCartKeysRef = useRef<Set<string>>(new Set());
  const cloudSyncedWishlistIdsRef = useRef<Set<string>>(new Set());
  const wasAuthenticatedRef = useRef(false);

  // ---- 1. Guest hydration — must resolve before anything writes back to
  // localStorage, or an initial empty state would clobber a returning
  // guest's saved cart/wishlist. ----
  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem('af-cart');
      const savedWishlist = window.localStorage.getItem('af-wishlist');
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedWishlist) setWishlist(new Set(JSON.parse(savedWishlist)));
    } catch {
      // ignore
    }
    setLocalReady(true);
  }, []);

  // ---- 2. Guest persistence — only while NOT authenticated. Authenticated
  // state lives in the cloud; localStorage must stay empty during an
  // account session so it never leaks into a later sign-out or a different
  // account signing in on the same browser (Phase J §31, §56). ----
  useEffect(() => {
    if (!localReady || isAuthenticated) return;
    try {
      window.localStorage.setItem('af-cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, localReady, isAuthenticated]);

  useEffect(() => {
    if (!localReady || isAuthenticated) return;
    try {
      window.localStorage.setItem('af-wishlist', JSON.stringify(Array.from(wishlist)));
    } catch {
      // ignore
    }
  }, [wishlist, localReady, isAuthenticated]);

  // ---- 3. Sign-in merge / cloud load. Runs once per authenticated mount
  // (or per new sign-in within the same page). Because guest localStorage
  // is cleared right after a successful merge and is never repopulated on
  // sign-out, merging the (by then empty) guest state back in on a later
  // reload or a repeated login is a no-op against the current cloud truth
  // — this is what keeps the whole flow idempotent without a separate
  // "already merged" flag (Phase J §27, §29, §30, §60, §61). ----
  useEffect(() => {
    if (isAdminRoute) return;
    if (!localReady || !authReady) return;

    if (!isAuthenticated || !user) {
      if (wasAuthenticatedRef.current) {
        // Just signed out: the account's cart/wishlist must not leak into
        // guest view. Guest storage is already empty from the last merge.
        setCart([]);
        setWishlist(new Set());
      }
      wasAuthenticatedRef.current = false;
      setCloudPhase('idle');
      cloudSyncedCartKeysRef.current = new Set();
      cloudSyncedWishlistIdsRef.current = new Set();
      return;
    }

    wasAuthenticatedRef.current = true;
    if (cloudPhase === 'syncing' || cloudPhase === 'ready') return;

    let cancelled = false;
    setCloudPhase('syncing');

    (async () => {
      const supabase = createBrowserClient();
      const [cloudCart, cloudWishlist] = await Promise.all([
        fetchCloudCart(supabase, user.id),
        fetchCloudWishlist(supabase, user.id),
      ]);
      if (cancelled) return;

      const mergedCart = mergeCartLines(cartRef.current, cloudCart);
      const mergedWishlist = mergeWishlists(wishlistRef.current, cloudWishlist);

      const cloudCartKeys = new Set(cloudCart.map(getLineKey));
      const [cartResult, wishlistResult] = await Promise.all([
        reconcileCloudCart(supabase, user.id, mergedCart, cloudCartKeys),
        reconcileCloudWishlist(supabase, user.id, mergedWishlist, cloudWishlist),
      ]);
      if (cancelled) return;

      if (cartResult.ok && wishlistResult.ok) {
        // Cloud write succeeded first — only now is it safe to treat the
        // merge as settled and clear the guest copy (Phase J §29).
        setCart(mergedCart);
        setWishlist(mergedWishlist);
        cloudSyncedCartKeysRef.current = cartResult.syncedKeys;
        cloudSyncedWishlistIdsRef.current = wishlistResult.syncedIds;
        try {
          window.localStorage.removeItem('af-cart');
          window.localStorage.removeItem('af-wishlist');
        } catch {
          // ignore
        }
        setCloudPhase('ready');
      } else {
        // Guest data stays exactly as it was — no login operation may
        // destroy a cart. A later mutation or reload will retry.
        setCloudPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localReady, authReady, isAuthenticated, user?.id, isAdminRoute]);

  // ---- 4. Per-mutation cloud sync while the account is the source of
  // truth. Always reconciles the full current list — cheap at this scale,
  // and idempotent, so a failed attempt safely retries on the next change
  // without any special-casing. ----
  useEffect(() => {
    if (isAdminRoute || cloudPhase !== 'ready' || !user) return;
    let cancelled = false;
    setSyncStatus('syncing');
    (async () => {
      const supabase = createBrowserClient();
      const result = await reconcileCloudCart(supabase, user.id, cart, cloudSyncedCartKeysRef.current);
      if (cancelled) return;
      if (result.ok) {
        cloudSyncedCartKeysRef.current = result.syncedKeys;
        setSyncStatus('idle');
      } else {
        setSyncStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, cloudPhase, user?.id, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute || cloudPhase !== 'ready' || !user) return;
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const result = await reconcileCloudWishlist(supabase, user.id, wishlist, cloudSyncedWishlistIdsRef.current);
      if (cancelled) return;
      if (result.ok) {
        cloudSyncedWishlistIdsRef.current = result.syncedIds;
      } else {
        setSyncStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist, cloudPhase, user?.id, isAdminRoute]);

  // ---- 5. Retry a failed sync opportunistically on refocus, rather than
  // building a queue/offline-sync system disproportionate to the need. ----
  useEffect(() => {
    if (isAdminRoute) return;
    const retry = () => {
      if (syncStatus === 'error' && cloudPhase === 'ready') {
        // Nudge the sync effects to run again with the current state.
        setCart((c) => [...c]);
        setWishlist((w) => new Set(w));
      }
    };
    window.addEventListener('focus', retry);
    return () => window.removeEventListener('focus', retry);
  }, [syncStatus, cloudPhase, isAdminRoute]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const addToCart = (product: Product, variant?: Variant) => {
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id && line.variant?.id === variant?.id);
      if (existing) {
        return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, { productId: product.id, quantity: 1, variant, variantId: variant?.id }];
    });
    notify('Ajouté à votre panier');
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeFromCart = (index: number) => {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const toggleWish = (id: string) => {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        notify('Retiré de votre sélection');
      } else {
        next.add(id);
        notify('Ajouté à votre sélection');
      }
      return next;
    });
  };

  const isWished = (id: string) => wishlist.has(id);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        wishlist,
        wishlistCount: wishlist.size,
        toggleWish,
        isWished,
        toast,
        clearToast: () => setToast(''),
        searchOpen, setSearchOpen,
        cartOpen, setCartOpen,
        menuOpen, setMenuOpen,
        cloudSyncing: cloudPhase === 'syncing',
        syncStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
