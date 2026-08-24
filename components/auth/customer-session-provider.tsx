'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase/client';

type CustomerSessionContextType = {
  user: User | null;
  /** True once the initial session lookup has resolved (whether or not a
   *  user is signed in) — gates rendering so "Se connecter" never flashes
   *  into "Mon compte" a moment later. */
  authReady: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
};

const CustomerSessionContext = createContext<CustomerSessionContextType | null>(null);

export function CustomerSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let supabase: ReturnType<typeof createBrowserClient>;
    try {
      supabase = createBrowserClient();
    } catch {
      // Supabase not configured (local dev without env vars) — customer
      // accounts simply stay unavailable, guest mode is unaffected.
      setAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase not configured — nothing to sign out of.
    }
  };

  return (
    <CustomerSessionContext.Provider value={{ user, authReady, isAuthenticated: !!user, signOut }}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext);
  if (!context) {
    throw new Error('useCustomerSession must be used within a CustomerSessionProvider');
  }
  return context;
}
