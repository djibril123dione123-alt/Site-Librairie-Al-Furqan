import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

// Client sans typage générique pour éviter les conflits d'inférence 'never'
function getRawAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// A GET request must never create database state — the old handler here
// broke that on every click of "Dupliquer" (and on any prefetch/crawler
// hitting the link). Duplication is now a real mutation: POST, returning
// JSON so the client decides navigation, rather than a server redirect.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  }

  const supabase = getRawAdminClient();

  const { data: original, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !original) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
  }

  const baseSlug = `${original.slug}-copie`;
  const newSlug = `${baseSlug}-${Date.now()}`;

  // Construire l'objet à insérer sans les champs auto-générés — video_url
  // est explicitement exclu aussi : une vidéo TikTok présente un ouvrage
  // précis, et la copier vers un produit distinct lierait par erreur une
  // vidéo à un livre qu'elle ne présente pas (Intégration TikTok §1).
  const {
    id: _id,
    created_at: _created,
    updated_at: _updated,
    published_at: _published,
    video_url: _videoUrl,
    ...rest
  } = original;

  const { data: duplicate, error: insertError } = await supabase
    .from('products')
    .insert({
      ...rest,
      slug: newSlug,
      title: `${original.title} (copie)`,
      status: 'draft',
      featured: false,
      new_arrival: false,
      published_at: null,
    })
    .select('id')
    .single();

  if (insertError || !duplicate) {
    return NextResponse.json(
      { error: insertError?.message || 'Erreur lors de la duplication' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, id: duplicate.id });
}
