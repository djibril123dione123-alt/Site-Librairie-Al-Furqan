import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase pour le navigateur (utilise la clé anon publique).
 * À utiliser dans les Client Components uniquement.
 */
export function createBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Variables Supabase manquantes. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre .env.local'
    );
  }

  return createClient(url, key);
}
