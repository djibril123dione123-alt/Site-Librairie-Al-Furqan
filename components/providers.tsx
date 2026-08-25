'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Product, Variant } from '@/lib/types/ui';
import { useCustomerSession } from '@/components/auth/customer-session-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { getLineKey } from '@/lib/cart/identity';
import { createSyncCoordinator, type SyncStatus as CoordinatorStatus } from '@/lib/supabase/sync-coordinator';
import {
  fetchCloudCart,
  fetchCloudWishlist,
  mergeCartLines,
  mergeWishlists,
  reconcileCloudCart,
  reconcileCloudWishlist,
  sanitizeCartLines,
  sanitizeWishlistIds,
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

type CloudSyncStatus = CoordinatorStatus;

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
  /** error if either channel failed, syncing if either has dirty/in-flight
   *  work, idle only when both are clean and confirmed (Phase J.2 §18). */
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

  const [cloudPhase, setCloudPhaseState] = useState<CloudPhase>('idle');
  const [cartSyncStatus, setCartSyncStatusState] = useState<CloudSyncStatus>('idle');
  const [wishlistSyncStatus, setWishlistSyncStatusState] = useState<CloudSyncStatus>('idle');
  const syncStatus: CloudSyncStatus =
    cartSyncStatus === 'error' || wishlistSyncStatus === 'error'
      ? 'error'
      : cartSyncStatus === 'syncing' || wishlistSyncStatus === 'syncing'
        ? 'syncing'
        : 'idle';
  const [mergeRetryTick, setMergeRetryTick] = useState(0);

  // Refs so effects/async callbacks always see the LATEST value rather than
  // whatever was current when that closure was created — critical for
  // re-validating state after an `await` (Phase J.2 §10/§11), not just for
  // avoiding stale-closure bugs.
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const wishlistRef = useRef(wishlist);
  wishlistRef.current = wishlist;
  const userRef = useRef(user);
  userRef.current = user;
  const cloudPhaseRef = useRef<CloudPhase>('idle');
  const cartSyncStatusRef = useRef<CloudSyncStatus>('idle');
  const wishlistSyncStatusRef = useRef<CloudSyncStatus>('idle');

  const setCloudPhase = (phase: CloudPhase) => {
    cloudPhaseRef.current = phase;
    setCloudPhaseState(phase);
  };

  const cloudSyncedCartKeysRef = useRef<Set<string>>(new Set());
  const cloudSyncedWishlistIdsRef = useRef<Set<string>>(new Set());
  const wasAuthenticatedRef = useRef(false);

  // A cloud-truth refresh (Phase J.2 §10) writes straight into `cart`/
  // `wishlist` — that change must not immediately bounce back out as a
  // redundant (or, worse, a loop-inducing) cloud write. One-shot flags,
  // consumed by the very next sync effect run.
  const skipNextCartSyncRef = useRef(false);
  const skipNextWishlistSyncRef = useRef(false);

  // Serializes cloud writes per channel — at most one reconcile in flight
  // at a time, always for the latest state (Phase J.2 §1/§2). Created once;
  // `reset()` on any account transition so a slow write from a PREVIOUS
  // user session can never land under a new one (see the sign-in/out
  // effect below).
  const cartCoordinatorRef = useRef<ReturnType<typeof createSyncCoordinator<CartLine[]>> | null>(null);
  if (!cartCoordinatorRef.current) {
    cartCoordinatorRef.current = createSyncCoordinator<CartLine[]>({
      reconcile: async (snapshot) => {
        const uid = userRef.current?.id;
        if (!uid) return true;
        const supabase = createBrowserClient();
        const result = await reconcileCloudCart(supabase, uid, snapshot, cloudSyncedCartKeysRef.current);
        if (result.ok) cloudSyncedCartKeysRef.current = result.syncedKeys;
        return result.ok;
      },
      onStatusChange: (status) => {
        cartSyncStatusRef.current = status;
        setCartSyncStatusState(status);
      },
    });
  }
  const wishlistCoordinatorRef = useRef<ReturnType<typeof createSyncCoordinator<Set<string>>> | null>(null);
  if (!wishlistCoordinatorRef.current) {
    wishlistCoordinatorRef.current = createSyncCoordinator<Set<string>>({
      reconcile: async (snapshot) => {
        const uid = userRef.current?.id;
        if (!uid) return true;
        const supabase = createBrowserClient();
        const result = await reconcileCloudWishlist(supabase, uid, snapshot, cloudSyncedWishlistIdsRef.current);
        if (result.ok) cloudSyncedWishlistIdsRef.current = result.syncedIds;
        return result.ok;
      },
      onStatusChange: (status) => {
        wishlistSyncStatusRef.current = status;
        setWishlistSyncStatusState(status);
      },
    });
  }

  // ---- 1. Guest hydration — must resolve before anything writes back to
  // localStorage, or an initial empty state would clobber a returning
  // guest's saved cart/wishlist. Sanitized on the way in: a malformed row
  // (e.g. a hand-edited or corrupted af-cart) isn't just a cloud-sync
  // hazard — the live cart resolver's Supabase query fails outright for
  // EVERY line if even one productId isn't a real UUID, so a bad row must
  // never reach `cart`/`wishlist` state at all, cloud account or not. ----
  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem('af-cart');
      const savedWishlist = window.localStorage.getItem('af-wishlist');
      if (savedCart) setCart(sanitizeCartLines(JSON.parse(savedCart)).valid);
      if (savedWishlist) setWishlist(new Set(sanitizeWishlistIds(new Set(JSON.parse(savedWishlist))).valid));
    } catch {
      // ignore
    }
    setLocalReady(true);
  }, []);

  // ---- 2. Guest persistence — only while NOT authenticated, AND only once
  // any authenticated-account cart/wishlist has actually been cleared back
  // to guest values. `isAuthenticated` alone flips to false BEFORE the
  // sign-out branch below (effect 3, defined and therefore run right after
  // this one in the same commit) has a chance to run `setCart([])` — on
  // that exact render, `cart` here would still be the account's real data.
  // `wasAuthenticatedRef.current` is still true at that point (effect 3
  // hasn't flipped it yet) and only becomes false once effect 3 has
  // actually cleared the state, which is what makes this ordering safe
  // (Phase J.2 §15/§16/§17) — no window where account data can reach
  // af-cart/af-wishlist, not even transiently. ----
  useEffect(() => {
    if (!localReady || isAuthenticated || wasAuthenticatedRef.current) return;
    try {
      window.localStorage.setItem('af-cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, localReady, isAuthenticated]);

  useEffect(() => {
    if (!localReady || isAuthenticated || wasAuthenticatedRef.current) return;
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
        // Reset the coordinators too — a write from THIS account still
        // in flight must never land under whichever account signs in next.
        cartCoordinatorRef.current?.reset();
        wishlistCoordinatorRef.current?.reset();
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
      const [cartRead, wishlistRead] = await Promise.all([
        fetchCloudCart(supabase, user.id),
        fetchCloudWishlist(supabase, user.id),
      ]);
      if (cancelled) return;

      // Phase J.1 §1/§2 hard rule: a failed read is NOT the same thing as a
      // genuinely empty account. Proceeding as though it were would merge
      // (and then write) an assumed-empty cloud state, destroying guest
      // intent on a transient network/RLS/query failure. Neither read may
      // be trusted unless BOTH succeeded — guest cart/wishlist are left
      // completely untouched, cloudPhase becomes 'error' (retryable), and
      // nothing is cleared from localStorage.
      if (!cartRead.ok || !wishlistRead.ok) {
        setCloudPhase('error');
        return;
      }

      const cloudCart = cartRead.data;
      const cloudWishlist = wishlistRead.data;

      // Sanitized once more here (on top of the guest-hydration sanitizer)
      // as defense in depth — cart/wishlist state must never carry a
      // malformed row regardless of which side of the merge it came from,
      // since the live cart resolver's Supabase query fails for EVERY line
      // if even one productId isn't a real UUID (Phase J.2 §6/§7/§8).
      const mergedCart = sanitizeCartLines(mergeCartLines(cartRef.current, cloudCart)).valid;
      const mergedWishlist = new Set(sanitizeWishlistIds(mergeWishlists(wishlistRef.current, cloudWishlist)).valid);

      const cloudCartKeys = new Set(cloudCart.map(getLineKey));
      const [cartResult, wishlistResult] = await Promise.all([
        reconcileCloudCart(supabase, user.id, mergedCart, cloudCartKeys),
        reconcileCloudWishlist(supabase, user.id, mergedWishlist, cloudWishlist),
      ]);
      if (cancelled) return;

      if (cartResult.ok && wishlistResult.ok) {
        // Cloud write succeeded first — only now is it safe to treat the
        // merge as settled and clear the guest copy (Phase J §29). This
        // also correctly covers the legitimate "cloud reads succeeded and
        // came back empty" case (Phase J.1 §15): mergedCart/mergedWishlist
        // are then just the guest's own state, written up and only then
        // cleared locally.
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
  }, [localReady, authReady, isAuthenticated, user?.id, isAdminRoute, mergeRetryTick]);

  // ---- 4. Feed the per-channel sync coordinators whenever cart/wishlist
  // change while the account is the source of truth. The coordinator
  // itself guarantees at most one write in flight and always sends the
  // latest snapshot (Phase J.2 §1/§2) — this effect's only job is "this
  // changed, make sure the coordinator knows". ----
  useEffect(() => {
    if (isAdminRoute || cloudPhase !== 'ready') return;
    if (skipNextCartSyncRef.current) {
      // This change came FROM a cloud-truth refresh, not a local mutation
      // — it's already what the cloud has, feeding it back would be a
      // pointless (Phase J.2 §12) or even loop-prone write.
      skipNextCartSyncRef.current = false;
      return;
    }
    cartCoordinatorRef.current?.update(cart);
  }, [cart, cloudPhase, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute || cloudPhase !== 'ready') return;
    if (skipNextWishlistSyncRef.current) {
      skipNextWishlistSyncRef.current = false;
      return;
    }
    wishlistCoordinatorRef.current?.update(wishlist);
  }, [wishlist, cloudPhase, isAdminRoute]);

  // ---- 5. Cross-device / stale-tab reconciliation (Phase J.2 §10). A tab
  // left open while another device changes the account never had a reason
  // to notice — this pulls fresh cloud truth on refocus, but ONLY when
  // this session's own state is fully settled (§11): any dirty/in-flight/
  // error condition on either channel means "don't clobber what the
  // customer just did here", and skips the refresh entirely. Deliberately
  // no Realtime/websocket — a focus-triggered pull is proportionate to
  // "your other tab should catch up eventually", not live collaboration. ----
  useEffect(() => {
    if (isAdminRoute) return;

    const isLocalStateClean = () =>
      cartSyncStatusRef.current === 'idle' &&
      wishlistSyncStatusRef.current === 'idle' &&
      !cartCoordinatorRef.current?.isDirty() &&
      !cartCoordinatorRef.current?.isRunning() &&
      !wishlistCoordinatorRef.current?.isDirty() &&
      !wishlistCoordinatorRef.current?.isRunning();

    const reconcileFromCloud = async () => {
      if (!isAuthenticated || !user) return;
      if (cloudPhaseRef.current !== 'ready') return;
      if (!isLocalStateClean()) return;

      const uidAtStart = user.id;
      const supabase = createBrowserClient();
      const [cartRead, wishlistRead] = await Promise.all([
        fetchCloudCart(supabase, uidAtStart),
        fetchCloudWishlist(supabase, uidAtStart),
      ]);

      // Re-validate against the LATEST refs, not the values this function
      // closed over when it started — any of this can have changed while
      // the two fetches above were in flight (sign-out, a fresh local
      // mutation, a different account signing in).
      if (userRef.current?.id !== uidAtStart) return;
      if (cloudPhaseRef.current !== 'ready') return;
      if (!isLocalStateClean()) return;
      if (!cartRead.ok || !wishlistRead.ok) return;

      skipNextCartSyncRef.current = true;
      skipNextWishlistSyncRef.current = true;
      cloudSyncedCartKeysRef.current = new Set(cartRead.data.map(getLineKey));
      cloudSyncedWishlistIdsRef.current = new Set(wishlistRead.data);
      setCart(cartRead.data);
      setWishlist(wishlistRead.data);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') reconcileFromCloud();
    };
    window.addEventListener('focus', reconcileFromCloud);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', reconcileFromCloud);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminRoute, isAuthenticated, user?.id]);

  // ---- 6. Retry a failed sync opportunistically on refocus, rather than
  // building a queue/offline-sync system disproportionate to the need.
  // Three distinct failure states: a failed initial merge (cloudPhase ===
  // 'error') re-runs effect 3 from scratch against the still-intact guest
  // state; a failed per-channel sync asks that channel's own coordinator
  // to retry with whatever is CURRENTLY latest (never a stale snapshot —
  // Phase J.1 §4, Phase J.2 §3). ----
  useEffect(() => {
    if (isAdminRoute) return;
    const retry = () => {
      if (cloudPhaseRef.current === 'error') {
        setMergeRetryTick((t) => t + 1);
        return;
      }
      if (cartSyncStatusRef.current === 'error') cartCoordinatorRef.current?.retry();
      if (wishlistSyncStatusRef.current === 'error') wishlistCoordinatorRef.current?.retry();
    };
    window.addEventListener('focus', retry);
    return () => window.removeEventListener('focus', retry);
  }, [isAdminRoute]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const addToCart = (product: Product, variant?: Variant) => {
    setCart((current) => {
      // Canonical identity (productId + getVariantId), not `line.variant?.id`
      // — a cloud-restored line only ever carries `variantId`, never a full
      // `variant` snapshot, so comparing `.variant?.id` alone would treat it
      // as a different (base) line and add a duplicate instead of
      // incrementing (Phase J.1 §6).
      const targetKey = getLineKey({ productId: product.id, variantId: variant?.id });
      const existing = current.find((line) => getLineKey(line) === targetKey);
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
