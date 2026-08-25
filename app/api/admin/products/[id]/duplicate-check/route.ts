import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

/**
 * Read-only lookup for the "Dupliquer" confirmation: how many other
 * draft/archived rows already look like a copy of this product? This never
 * deletes or merges anything (Phase L §25 — operational guidance only) —
 * it just lets the confirm dialog say "2 brouillons similaires existent
 * déjà" instead of the operator finding out after clicking through.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ similarCount: 0 });
  }

  const supabase = createAdminClient();
  const { data: original } = await supabase.from('products').select('id, title').eq('id', params.id).single();
  if (!original) {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
  }

  const escaped = original.title.replace(/[%_]/g, (m: string) => `\\${m}`);
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .neq('id', original.id)
    .in('status', ['draft', 'archived'])
    .ilike('title', `%${escaped}%`);

  return NextResponse.json({ similarCount: count ?? 0 });
}
