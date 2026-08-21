import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase SSR pour le navigateur.
 * Utilise @supabase/ssr pour synchroniser automatiquement les tokens d'authentification
 * avec les cookies HTTP (sb-<project-ref>-auth-token), assurant la persistance
 * de session entre le navigateur client et le serveur Next.js.
 */
let browserClient: SupabaseClient | undefined;

export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Variables Supabase manquantes. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre .env.local'
    );
  }

  browserClient = createSupabaseBrowserClient(url, key);
  return browserClient;
}
