import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec service role key — SERVEUR UNIQUEMENT.
 * Bypasse le RLS. Ne jamais exposer au navigateur.
 *
 * Note: On utilise SupabaseClient sans typage générique Database ici
 * pour éviter les conflits d'inférence TypeScript sur les mutations.
 * Le typage explicite est géré au niveau des repositories.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Service role key manquant. Vérifiez SUPABASE_SERVICE_ROLE_KEY dans votre .env.local (côté serveur uniquement)'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
