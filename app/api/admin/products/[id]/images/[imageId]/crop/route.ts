import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidateProductSurfaces } from '@/lib/data/revalidate-product';

/**
 * Commit a crop already uploaded directly to Storage (see
 * lib/admin/direct-upload.ts) to one product image. Non-destructive by
 * construction: the derived file always got a brand-new storage path
 * (upload never overwrites), and the true original is never touched — see
 * the ordering below for exactly how that's enforced under partial
 * failure. This route no longer receives file bytes at all (Phase L.1
 * §11/§14) — only the small JSON path + crop metadata.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const newPath: string | undefined = body?.storagePath;
  const cropData: unknown = body?.cropData;
  if (!newPath || !cropData) {
    return NextResponse.json({ error: 'Chemin de fichier ou données de recadrage manquants' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: imageRow, error: fetchErr } = await supabase
    .from('product_images')
    .select('id, product_id, storage_path, original_storage_path')
    .eq('id', params.imageId)
    .eq('product_id', params.id)
    .single();

  if (fetchErr || !imageRow) {
    return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });
  }

  // The uploaded path must actually be namespaced under this product and
  // actually exist — the client only ever gets a signed URL scoped to a
  // path this server generated (see /api/admin/upload/sign), but this
  // still guards against a stale/reused path being committed.
  if (!newPath.startsWith(`${params.id}/`)) {
    return NextResponse.json({ error: 'Chemin de fichier invalide pour ce produit.' }, { status: 400 });
  }
  const { data: existsCheck, error: existsErr } = await supabase.storage.from('product-images').exists(newPath);
  if (existsErr || !existsCheck) {
    return NextResponse.json({ error: 'Le fichier recadré est introuvable — réessayez le recadrage.' }, { status: 400 });
  }

  // The true, never-retouched original: if this image was never cropped
  // before, its CURRENT storage_path is that original (Phase L §13 legacy
  // compatibility rule). If it was already cropped, original_storage_path
  // already points to it and must be carried forward unchanged.
  const trueOriginalPath: string = imageRow.original_storage_path || imageRow.storage_path;
  const oldDisplayPath: string = imageRow.storage_path;

  // DB update is the authoritative step. If it fails, the operator must
  // never be told the crop saved — roll back the orphaned upload and
  // report failure; the row keeps pointing at whatever it pointed at
  // before (untouched).
  const { error: updateErr } = await supabase
    .from('product_images')
    .update({ storage_path: newPath, original_storage_path: trueOriginalPath, crop_data: cropData as any })
    .eq('id', params.imageId);

  if (updateErr) {
    await supabase.storage.from('product-images').remove([newPath]).catch(() => {});
    return NextResponse.json({ error: 'Le recadrage n\'a pas pu être enregistré (base de données).' }, { status: 500 });
  }

  // Only now — DB already points at the new derivative — clean up the
  // previous DISPLAY file, but only if it was itself a derivative (never
  // the true original) and nothing else still references that exact path.
  if (oldDisplayPath !== trueOriginalPath && oldDisplayPath !== newPath) {
    const { count } = await supabase
      .from('product_images')
      .select('*', { count: 'exact', head: true })
      .or(`storage_path.eq.${oldDisplayPath},original_storage_path.eq.${oldDisplayPath}`);
    if ((count ?? 0) === 0) {
      // Best-effort: a failure here must never undo the now-valid DB row.
      await supabase.storage.from('product-images').remove([oldDisplayPath]).catch(() => {});
    }
  }

  const { data: product } = await supabase.from('products').select('slug').eq('id', params.id).single();
  if (product?.slug) revalidateProductSurfaces(product.slug);

  const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(newPath);

  return NextResponse.json({
    success: true,
    storagePath: newPath,
    originalStoragePath: trueOriginalPath,
    cropData,
    publicUrl: publicUrlData.publicUrl,
  });
}
