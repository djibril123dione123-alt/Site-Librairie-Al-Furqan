import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidatePath } from 'next/cache';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }
  const body = await request.json();
  const supabase = createAdminClient();
  const update: Record<string, any> = {};
  if ('isVisible' in body) update.is_visible = body.isVisible;
  if ('position' in body) update.position = body.position;
  if ('name' in body) update.name = body.name;

  const { error } = await supabase.from('categories').update(update as any).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/catalogue');
  return NextResponse.json({ success: true });
}
