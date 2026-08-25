import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { z } from 'zod';
import { revalidateCollectionSurfaces } from '@/lib/data/revalidate-collection';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const productRefSchema = z.object({
  productId: z.string(),
  position: z.number(),
});

const collectionSchema = z.object({
  slug: z.string().nullable().optional(),
  title: z.string().min(1, 'Titre requis'),
  eyebrow: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']),
  products: z.array(productRefSchema).optional(),
});

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('collections')
    .select('id, slug, title, eyebrow, status, position')
    .order('position');
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, id: 'dev-mode' });
  }

  const body = await request.json();
  const parsed = collectionSchema.safeParse(body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((issue) => `Champ invalide : ${issue.path.join('.')} — ${issue.message}`).join(', ');
    return NextResponse.json({ error: errorMessages }, { status: 400 });
  }
  const data = parsed.data;

  if (data.status === 'published' && !data.description?.trim()) {
    return NextResponse.json({ error: 'Une description est nécessaire pour publier une collection.' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const baseSlug = generateSlug(data.slug || data.title);
  let slug = baseSlug;
  const { data: existingSlug } = await supabase.from('collections').select('id').eq('slug', slug).single();
  if (existingSlug) {
    return NextResponse.json({ error: `Le slug "${slug}" est déjà utilisé par une autre collection.` }, { status: 400 });
  }

  const { count } = await supabase.from('collections').select('*', { count: 'exact', head: true });

  const { data: collection, error } = await supabase
    .from('collections')
    .insert({
      slug,
      title: data.title,
      eyebrow: data.eyebrow || null,
      description: data.description || null,
      status: data.status,
      position: count ?? 0,
    } as any)
    .select('id, slug')
    .single();

  if (error || !collection) {
    return NextResponse.json({ error: error?.message || 'Erreur lors de la création de la collection' }, { status: 500 });
  }

  if (data.products && data.products.length > 0) {
    const rows = data.products.map((p) => ({
      collection_id: collection.id,
      product_id: p.productId,
      position: p.position,
    }));
    const { error: linkErr } = await supabase.from('collection_products').insert(rows as any);
    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
  }

  revalidateCollectionSurfaces(collection.slug);

  return NextResponse.json({ success: true, id: collection.id, slug: collection.slug });
}
