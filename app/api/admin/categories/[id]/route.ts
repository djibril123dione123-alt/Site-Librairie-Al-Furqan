import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
