import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { revalidateProductSurfaces } from '@/lib/data/revalidate-product';

/**
 * Revert to the untouched original. `original_storage_path` is left
 * populated (not nulled) so a later crop never needs a re-upload — see
 * Phase L's explicit preferred final state.
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

  if (!imageRow.original_storage_path) {
    // Already the original — nothing to reset, not an error.
    const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(imageRow.storage_path);
    return NextResponse.json({
      success: true,
      storagePath: imageRow.storage_path,
      originalStoragePath: imageRow.storage_path,
      publicUrl: publicUrlData.publicUrl,
    });
  }

  const oldDerivedPath = imageRow.storage_path;
  const originalPath = imageRow.original_storage_path;

  const { error: updateErr } = await supabase
    .from('product_images')
    .update({ storage_path: originalPath, crop_data: null })
    .eq('id', params.imageId);

  if (updateErr) {
    return NextResponse.json({ error: 'La réinitialisation n\'a pas pu être enregistrée.' }, { status: 500 });
  }

  if (oldDerivedPath !== originalPath) {
    const { count } = await supabase
      .from('product_images')
      .select('*', { count: 'exact', head: true })
      .or(`storage_path.eq.${oldDerivedPath},original_storage_path.eq.${oldDerivedPath}`);
    if ((count ?? 0) === 0) {
      await supabase.storage.from('product-images').remove([oldDerivedPath]).catch(() => {});
    }
  }

  const { data: product } = await supabase.from('products').select('slug').eq('id', params.id).single();
  if (product?.slug) revalidateProductSurfaces(product.slug);

  const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(originalPath);

  return NextResponse.json({
    success: true,
    storagePath: originalPath,
    originalStoragePath: originalPath,
    publicUrl: publicUrlData.publicUrl,
  });
}
