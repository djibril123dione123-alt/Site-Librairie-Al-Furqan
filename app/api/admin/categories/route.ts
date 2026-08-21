import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
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
