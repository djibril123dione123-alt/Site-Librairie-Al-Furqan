import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // real catalogue photos, not the old 5MB proxy-upload ceiling

/**
 * Issues a short-lived, path-scoped Supabase Storage signed upload URL so
 * the browser can send the actual file bytes straight to Storage — never
 * through this Vercel Function's request body, which caps at 4.5MB
 * (Phase L.1 §11/§12). The path is generated server-side from validated
 * inputs only; the client never chooses where its file lands.
 */
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const { contentType, productId, size, suffix } = body as {
    contentType?: string;
    productId?: string;
    size?: number;
    suffix?: string;
  };

  if (!contentType || !ALLOWED_TYPES[contentType]) {
    return NextResponse.json({ error: "Format d'image non supporté (JPG, PNG, WebP uniquement)" }, { status: 400 });
  }
  if (typeof size === 'number' && size > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (maximum 15 Mo).' }, { status: 400 });
  }
  // Namespace only: a real id if it's a plausible uuid, otherwise the
  // established "temp/" bucket for pre-save uploads on a not-yet-created
  // product. Never trust a client-supplied path.
  const namespace = productId && /^[0-9a-f-]{36}$/i.test(productId) ? productId : 'temp';
  const ext = ALLOWED_TYPES[contentType];
  // `suffix` lets the crop editor mark its derivatives distinctly
  // ("-crop") without the client controlling the actual path/namespace.
  const safeSuffix = suffix === 'crop' ? '-crop' : '';
  const path = `${namespace}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeSuffix}.${ext}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from('product-images').createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Erreur lors de la préparation de l\'upload' }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
