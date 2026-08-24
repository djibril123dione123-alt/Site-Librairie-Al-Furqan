import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/auth';
import { sanitizeNextPath } from '@/lib/auth/safe-redirect';

/**
 * Magic Link lands here with a PKCE `code` to exchange for a real session.
 * `next` is customer-controlled input (round-tripped through the email
 * link) and must never become an open redirect — sanitizeNextPath only
 * ever allows a relative internal path, falling back to /compte.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'), '/compte');

  if (code) {
    const supabase = await createSSRClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?next=${encodeURIComponent(next)}&error=callback`);
}
