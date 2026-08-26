import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';
import { isValidTikTokUrl, normalizeTikTokUrl } from '@/lib/social/tiktok';

function parsePosition(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null;
}

function revalidateHomepageTikTokSurfaces() {
  revalidatePath('/');
  revalidatePath('/admin/videos-tiktok');
}

// Fills or replaces the video in one fixed slot (1/2/3). A slot with no
// row is simply empty — this upserts on the unique `position` column
// rather than requiring the operator to know whether one already exists.
export async function PUT(request: NextRequest, { params }: { params: { position: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const position = parsePosition(params.position);
  if (position === null) {
    return NextResponse.json({ error: 'Emplacement invalide.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const rawUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : '';
  if (!rawUrl || !isValidTikTokUrl(rawUrl)) {
    return NextResponse.json({ error: 'Entrez un lien de vidéo TikTok valide.' }, { status: 400 });
  }
  const videoUrl = normalizeTikTokUrl(rawUrl);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('homepage_tiktok_videos')
    .upsert(
      {
        position,
        video_url: videoUrl,
        product_id: body.productId || null,
        is_active: body.isActive !== false,
      } as any,
      { onConflict: 'position' }
    )
    .select('id, video_url, position, product_id, is_active')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Erreur lors de l\'enregistrement.' }, { status: 500 });
  }

  revalidateHomepageTikTokSurfaces();

  return NextResponse.json({
    success: true,
    id: data.id,
    videoUrl: data.video_url,
    position: data.position,
    productId: data.product_id,
    isActive: data.is_active,
  });
}

// Empties the slot entirely (distinct from is_active=false, which keeps
// the configuration but hides it from the public homepage).
export async function DELETE(request: NextRequest, { params }: { params: { position: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const position = parsePosition(params.position);
  if (position === null) {
    return NextResponse.json({ error: 'Emplacement invalide.' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('homepage_tiktok_videos').delete().eq('position', position);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateHomepageTikTokSurfaces();

  return NextResponse.json({ success: true });
}
