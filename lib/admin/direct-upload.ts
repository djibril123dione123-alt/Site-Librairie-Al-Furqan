import { createBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'product-images';

/**
 * Uploads a file (or generated Blob) straight to Supabase Storage using a
 * short-lived signed URL obtained from the server, so the actual bytes
 * never pass through a Vercel Function request body — that path caps at
 * 4.5MB, which a real catalogue photo or a crop derivative can exceed
 * (Phase L.1 §11/§12). The server only ever sees the resulting `path` in a
 * small JSON "commit" request afterwards.
 */
export async function directUploadToStorage(
  fileOrBlob: File | Blob,
  options: { productId?: string; contentType: string; suffix?: 'crop' }
): Promise<{ path: string; publicUrl: string }> {
  const signRes = await fetch('/api/admin/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: options.contentType,
      productId: options.productId,
      size: fileOrBlob.size,
      suffix: options.suffix,
    }),
  });
  const signData = await signRes.json();
  if (!signRes.ok) {
    throw new Error(signData.error || "Impossible de préparer l'upload.");
  }

  const supabase = createBrowserClient();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(signData.path, signData.token, fileOrBlob, { contentType: options.contentType });

  if (uploadErr) {
    throw new Error(uploadErr.message || "Échec de l'envoi du fichier.");
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(signData.path);

  return { path: signData.path, publicUrl: publicUrlData.publicUrl };
}
