import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { findExistingByExactName } from '@/lib/supabase/entity-dedupe';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Reads the same `authors` data already public via RLS on /auteurs, but
// this path lives under /api/admin/ and is only ever called from the
// authenticated Admin — gated for consistency with every other endpoint
// here rather than relying on "it happens to be public anyway" (Phase L.1
// §16 audit).
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const supabase = createServerClient();
  const { data, error } = await supabase.from('authors').select('id, name, slug, bio, created_at').order('name');
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, id: 'dev-author-id', name: 'Auteur Dev' });
  }

  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Le nom de l\'auteur est requis' }, { status: 400 });
  }

  const name = body.name.trim();
  const baseSlug = generateSlug(name);
  const supabase = createAdminClient();

  // Exact-match check (trim + case only — see normalizeExactName). This is
  // the primary duplicate guard: a Phase K audit found two "Abd Ar-Razzâq
  // al-Badr" author rows created 0.3s apart, because the old code here only
  // checked slug once, then on a (redundant) second slug check silently
  // minted a NEW row with a Date.now()-suffixed slug instead of reusing the
  // entity that already owned it. Reuse-on-match replaces that entirely.
  const existing = await findExistingByExactName(supabase, 'authors', name);
  if (existing) {
    return NextResponse.json({ success: true, id: existing.id, name: existing.name });
  }

  const { data: author, error } = await supabase
    .from('authors')
    .insert({
      name,
      slug: baseSlug,
      bio: body.bio || null,
    } as any)
    .select('id, name, slug')
    .single();

  if (error) {
    // A unique-slug violation here means another request won a genuine race
    // (both passed the exact-match check above before either had committed)
    // — reuse the winner instead of mangling a divergent duplicate slug.
    if (error.code === '23505') {
      const winner = await findExistingByExactName(supabase, 'authors', name);
      if (winner) {
        return NextResponse.json({ success: true, id: winner.id, name: winner.name });
      }
    }
    return NextResponse.json({ error: error.message || 'Erreur lors de la création de l\'auteur' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: author.id, name: author.name, slug: author.slug });
}
