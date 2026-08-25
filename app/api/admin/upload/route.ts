import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

// The old POST here proxied the full file through this Vercel Function's
// request body (capped at 4.5MB in production) — replaced by
// /api/admin/upload/sign + a direct browser→Storage upload (Phase L.1
// §11-13). Only DELETE (cleanup) remains on this route.

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
