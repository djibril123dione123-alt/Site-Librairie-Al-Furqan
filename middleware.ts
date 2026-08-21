import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Dev sans Supabase configuré → accès libre
  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    if (process.env.USE_SEED_DATA === 'true' || process.env.NODE_ENV !== 'production') {
      return NextResponse.next();
    }
  }

  let token: string | undefined;

  // 1. Bearer Token (priorité pour les API)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    // 2. Récupération du Cookie
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] ?? '';
    const cookieName = `sb-${projectRef}-auth-token`;
    
    let cookieStr = '';
    for (let i = 0; i < 5; i++) {
      const chunk = request.cookies.get(`${cookieName}.${i}`);
      if (chunk) cookieStr += chunk.value;
      else break;
    }
    if (!cookieStr) cookieStr = request.cookies.get(cookieName)?.value || '';

    if (cookieStr) token = cookieStr; // Simple vérification de présence
  }

  // Présence d'un token (la vraie validation cryptographique se fait dans requireAdmin côté Node.js)
  const hasSession = !!token;

  const isApiAdminRoute = pathname.startsWith('/api/admin');
  const isAdminPageRoute = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');

  if (!hasSession && (isApiAdminRoute || isAdminPageRoute)) {
    // Non connecté
    if (isApiAdminRoute) {
      return NextResponse.json({ error: 'Non autorisé (Middleware)' }, { status: 401 });
    } else {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si l'utilisateur est connecté mais que c'est une API, le Helper requireAdmin() 
  // dans la route finale vérifiera son rôle. Le middleware laisse passer la requête.
  // Pareil pour les pages, le layout vérifiera le rôle.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - images, icons, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
