import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

function parsePosition(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null;
}

// Swaps this slot's video with its immediate neighbor (1↔2 or 2↔3) — with
// only 3 fixed positions, a full drag-and-drop reorder isn't needed, and
// this mirrors the same sequential-with-revert pattern already used for
// collection reordering (Phase L §22).
export async function POST(request: NextRequest, { params }: { params: { position: string } }) {
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
  const direction = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : null;
  const targetPosition = direction !== null ? position + direction : null;
  if (!targetPosition || targetPosition < 1 || targetPosition > 3) {
    return NextResponse.json({ error: 'Direction invalide' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: rows, error: fetchErr } = await supabase
    .from('homepage_tiktok_videos')
    .select('id, position')
    .in('position', [position, targetPosition]);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const current = (rows || []).find((r) => r.position === position);
  const target = (rows || []).find((r) => r.position === targetPosition);
  if (!current || !target) {
    return NextResponse.json({ error: 'Les deux emplacements doivent être remplis pour être échangés.' }, { status: 400 });
  }

  // The `position` column is unique, so both rows can never briefly share
  // a value — swap through a scratch position (0, outside the 1-3 range)
  // instead of colliding on the constraint mid-swap.
  const { error: err1 } = await supabase.from('homepage_tiktok_videos').update({ position: 0 } as any).eq('id', current.id);
  if (err1) {
    return NextResponse.json({ error: 'Erreur lors du réordonnancement' }, { status: 500 });
  }
  const { error: err2 } = await supabase.from('homepage_tiktok_videos').update({ position: current.position } as any).eq('id', target.id);
  if (err2) {
    await supabase.from('homepage_tiktok_videos').update({ position: current.position } as any).eq('id', current.id);
    return NextResponse.json({ error: 'Erreur lors du réordonnancement (annulé).' }, { status: 500 });
  }
  const { error: err3 } = await supabase.from('homepage_tiktok_videos').update({ position: target.position } as any).eq('id', current.id);
  if (err3) {
    return NextResponse.json({ error: 'Erreur lors du réordonnancement (état partiel — vérifiez les emplacements).' }, { status: 500 });
  }

  revalidatePath('/');
  revalidatePath('/admin/videos-tiktok');

  return NextResponse.json({ success: true });
}
