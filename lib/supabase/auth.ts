import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

/**
 * Crée un client Supabase Server-Side compatible avec App Router.
 * Gère automatiquement la lecture des cookies et du header Authorization.
 */
export async function createSSRClient() {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  const authHeader = headersList.get('authorization');
  const globalHeaders: Record<string, string> = {};
  if (authHeader) {
    globalHeaders['Authorization'] = authHeader;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Ignoré si appelé dans un Server Component (qui ne peut pas modifier les cookies).
          }
        },
      },
      global: {
        headers: globalHeaders
      }
    }
  );
}

export type AdminAuthResult = 
  | { user: any; error: null }
  | { user: null; error: 'UNAUTHORIZED' | 'FORBIDDEN' };

/**
 * Validation stricte du rôle Admin côté serveur.
 * DOIT être appelé en premier dans toutes les routes d'API privilégiées.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  // Mode dev fallback (quand Supabase n'est pas configuré)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co') {
    if (process.env.USE_SEED_DATA === 'true' || process.env.NODE_ENV !== 'production') {
      return { user: { id: 'dev-admin' }, error: null };
    }
  }

  const supabase = await createSSRClient();
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const jwt = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  
  // 1. Récupération stricte de la session côté serveur
  const { data: { user }, error: authError } = jwt 
    ? await supabase.auth.getUser(jwt)
    : await supabase.auth.getUser();
  
  if (authError || !user) {
    return { user: null, error: 'UNAUTHORIZED' };
  }

  // 2. Vérification stricte du rôle
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { user: null, error: 'FORBIDDEN' };
  }

  return { user, error: null };
}
