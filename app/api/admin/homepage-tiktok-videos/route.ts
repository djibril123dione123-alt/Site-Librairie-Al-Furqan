import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

// Service-role backed (returns inactive slots too, so the operator can see
// and re-enable a temporarily hidden one) — admin-gated like every other
// verb on this route.
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('homepage_tiktok_videos')
    .select('id, video_url, position, product_id, is_active, products(id, title)')
    .gte('position', 1)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data || []).map((row: any) => ({
      id: row.id,
      videoUrl: row.video_url,
      position: row.position,
      productId: row.product_id,
      productTitle: row.products?.title || null,
      isActive: row.is_active,
    }))
  );
}
