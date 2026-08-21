import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de protection des routes admin.
 *
 * Stratégie Edge-compatible :
 * - On ne peut pas importer @supabase/supabase-js dans le middleware
 *   (Edge Runtime ne supporte pas process.versions / websocket natif).
 * - On vérifie simplement la présence d'un cookie de session Supabase.
 * - La vérification du rôle admin est faite dans les Server Components
 *   (app/admin/layout.tsx et chaque page admin) via createServerClient.
 *
 * Si Supabase n'est pas configuré (dev sans .env.local) → accès libre.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Uniquement /admin/* (sauf /admin/login)
  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Dev sans Supabase configuré → accès libre (warning dans les pages)
  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    return NextResponse.next();
  }

  // Vérifier la présence d'un cookie de session Supabase
  // Le nom du cookie varie selon la version du SDK : on teste plusieurs patterns
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] ?? '';
  const cookieNames = [
    'sb-access-token',
    `sb-${projectRef}-auth-token`,
    `supabase-auth-token`,
  ];

  const hasSession = cookieNames.some(
    (name) => !!request.cookies.get(name)?.value
  );

  if (!hasSession) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session présente → laisser passer, la vérification du rôle est dans les pages
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
