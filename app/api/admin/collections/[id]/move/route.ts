import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidateCollectionSurfaces } from '@/lib/data/revalidate-collection';

/**
 * Swap this collection's position with its immediate neighbor in the
 * published-order list. Accessible move-up/move-down, not drag-and-drop —
 * Phase L §6 asks for accessible controls first, drag as an optional
 * addition only.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const body = await request.json();
  const direction = body.direction === 'up' ? -1 : body.direction === 'down' ? 1 : null;
  if (!direction) {
    return NextResponse.json({ error: 'Direction invalide' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: all, error } = await supabase.from('collections').select('id, position').order('position');
  if (error || !all) {
    return NextResponse.json({ error: 'Erreur lors de la lecture des collections' }, { status: 500 });
  }

  const index = all.findIndex((c) => c.id === params.id);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= all.length) {
    return NextResponse.json({ success: true }); // already at the edge — no-op, not an error
  }

  const current = all[index];
  const neighbor = all[targetIndex];

  // Sequential, not Promise.all: the two updates together are a single
  // logical swap, and running them concurrently means a failure on either
  // one can leave both rows sharing the same position with no attempt to
  // recover. Doing them in order lets a second-step failure be undone
  // (Phase L.1 §22).
  const { error: err1 } = await supabase.from('collections').update({ position: neighbor.position } as any).eq('id', current.id);
  if (err1) {
    return NextResponse.json({ error: 'Erreur lors du réordonnancement' }, { status: 500 });
  }

  const { error: err2 } = await supabase.from('collections').update({ position: current.position } as any).eq('id', neighbor.id);
  if (err2) {
    // Best-effort revert of the first step so a partial failure doesn't
    // leave two collections sharing one position.
    await supabase.from('collections').update({ position: current.position } as any).eq('id', current.id);
    return NextResponse.json({ error: 'Erreur lors du réordonnancement (annulé).' }, { status: 500 });
  }

  revalidateCollectionSurfaces();

  return NextResponse.json({ success: true });
}
