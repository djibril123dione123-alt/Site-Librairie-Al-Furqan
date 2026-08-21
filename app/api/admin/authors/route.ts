import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured, createServerClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export async function GET() {
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

  // Check if exists
  const { data: existing } = await supabase.from('authors').select('id, name').eq('slug', baseSlug).single();
  if (existing) {
    return NextResponse.json({ success: true, id: existing.id, name: existing.name });
  }

  let slug = baseSlug;
  const { data: slugCheck } = await supabase.from('authors').select('id').eq('slug', slug).single();
  if (slugCheck) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  const { data: author, error } = await supabase
    .from('authors')
    .insert({
      name,
      slug,
      bio: body.bio || null,
    } as any)
    .select('id, name, slug')
    .single();

  if (error || !author) {
    return NextResponse.json({ error: error?.message || 'Erreur lors de la création de l\'auteur' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: author.id, name: author.name, slug: author.slug });
}
