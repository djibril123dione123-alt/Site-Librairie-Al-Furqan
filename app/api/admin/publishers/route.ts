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

// Same reasoning as the authors GET — already-public data, gated anyway
// for consistency since this path lives under /api/admin/ (Phase L.1 §16).
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const supabase = createServerClient();
  const { data, error } = await supabase.from('publishers').select('id, name, slug, description, created_at').order('name');
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, id: 'dev-publisher-id', name: 'Éditeur Dev' });
  }

  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Le nom de l\'éditeur est requis' }, { status: 400 });
  }

  const name = body.name.trim();
  const baseSlug = generateSlug(name);
  const supabase = createAdminClient();

  const existing = await findExistingByExactName(supabase, 'publishers', name);
  if (existing) {
    return NextResponse.json({ success: true, id: existing.id, name: existing.name });
  }

  const { data: publisher, error } = await supabase
    .from('publishers')
    .insert({
      name,
      slug: baseSlug,
      description: body.description || null,
    } as any)
    .select('id, name, slug')
    .single();

  if (error) {
    if (error.code === '23505') {
      const winner = await findExistingByExactName(supabase, 'publishers', name);
      if (winner) {
        return NextResponse.json({ success: true, id: winner.id, name: winner.name });
      }
    }
    return NextResponse.json({ error: error.message || 'Erreur lors de la création de l\'éditeur' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: publisher.id, name: publisher.name, slug: publisher.slug });
}
