import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidateProductSurfaces } from '@/lib/data/revalidate-product';

/**
 * Apply a crop to one product image. Non-destructive by construction:
 * the derived file always gets a brand-new storage path (upload never
 * overwrites), and the true original is never touched — see the ordering
 * below for exactly how that's enforced under partial failure.
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

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const cropDataRaw = formData.get('cropData') as string | null;
  if (!file || !cropDataRaw) {
    return NextResponse.json({ error: 'Fichier ou données de recadrage manquants' }, { status: 400 });
  }
  let cropData: unknown;
  try {
    cropData = JSON.parse(cropDataRaw);
  } catch {
    return NextResponse.json({ error: 'Données de recadrage invalides' }, { status: 400 });
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

  // The true, never-retouched original: if this image was never cropped
  // before, its CURRENT storage_path is that original (Phase L §13 legacy
  // compatibility rule). If it was already cropped, original_storage_path
  // already points to it and must be carried forward unchanged.
  const trueOriginalPath: string = imageRow.original_storage_path || imageRow.storage_path;
  const oldDisplayPath: string = imageRow.storage_path;

  const bytes = Buffer.from(await file.arrayBuffer());
  const newPath = `${params.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-crop.png`;

  const { error: uploadErr } = await supabase.storage
    .from('product-images')
    .upload(newPath, bytes, { contentType: 'image/png', upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: `Échec de l'upload du recadrage : ${uploadErr.message}` }, { status: 500 });
  }

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
