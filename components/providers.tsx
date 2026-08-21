'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Product, Variant } from '@/lib/types/ui';

export type CartLine = {
  productId: string;
  quantity: number;
  variant?: Variant;
};

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
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedCart = window.localStorage.getItem('af-cart');
      const savedWishlist = window.localStorage.getItem('af-wishlist');
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedWishlist) setWishlist(new Set(JSON.parse(savedWishlist)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    window.localStorage.setItem('af-cart', JSON.stringify(cart));
  }, [cart, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    window.localStorage.setItem('af-wishlist', JSON.stringify(Array.from(wishlist)));
  }, [wishlist, isMounted]);

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
      return [...current, { productId: product.id, quantity: 1, variant }];
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
