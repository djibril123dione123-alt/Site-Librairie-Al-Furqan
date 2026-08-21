import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Variables Supabase manquantes. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans votre .env.local'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Détermine si l'application doit utiliser les données fictives locales (seed).
 * En production, le fallback est DÉSACTIVÉ par défaut pour éviter d'afficher de faux produits.
 */
export function shouldUseSeedData(): boolean {
  // Si explicitement activé via l'environnement
  if (process.env.USE_SEED_DATA === 'true') {
    return true;
  }
  
  // En production, JAMAIS de seed par défaut
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // En développement, si Supabase n'est pas configuré, on autorise le seed
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
  );

  return !isConfigured;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'
  );
}
