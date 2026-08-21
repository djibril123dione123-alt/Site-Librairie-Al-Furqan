import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, id: `dev-${Date.now()}` });
  }
  const body = await request.json();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: body.name, slug: body.slug, position: body.position ?? 0, is_visible: true } as any)
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/catalogue');
  return NextResponse.json({ success: true, id: data.id });
}
