import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, url: '/images/books/sample-cover.png' });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = (formData.get('productId') as string) || 'temp';

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Format d\'image non supporté (JPG, PNG, WebP)' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop grand (maximum 5 Mo)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type.split('/')[1] || 'jpg';
    const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return NextResponse.json({ 
      success: true, 
      storagePath: data.path,
      publicUrl: publicUrlData.publicUrl 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'upload' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json();
    // A cropped image owns two storage objects (derivative + untouched
    // original) — `paths` covers that; `path` stays supported for any
    // other caller still sending the single-path shape.
    const rawPaths: unknown[] = Array.isArray(body.paths) ? body.paths : body.path ? [body.path] : [];
    const paths = Array.from(new Set(rawPaths.filter((p): p is string => typeof p === 'string' && p.length > 0)));
    if (paths.length === 0) return NextResponse.json({ error: 'Chemin de fichier requis' }, { status: 400 });

    const supabase = createAdminClient();

    // Each path is checked independently — one may still be referenced
    // (e.g. the same original reused via a restored crop) while another
    // isn't; never delete the same object twice, never delete one still
    // referenced by another row.
    const toRemove: string[] = [];
    for (const path of paths) {
      const { count } = await supabase
        .from('product_images')
        .select('*', { count: 'exact', head: true })
        .or(`storage_path.eq.${path},original_storage_path.eq.${path}`);
      if ((count ?? 0) === 0) toRemove.push(path);
    }

    if (toRemove.length > 0) {
      const { error } = await supabase.storage.from('product-images').remove(toRemove);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur suppression fichier' }, { status: 500 });
  }
}
