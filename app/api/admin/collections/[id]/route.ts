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

const collectionUpdateSchema = z.object({
  slug: z.string().nullable().optional(),
  title: z.string().min(1, 'Titre requis').optional(),
  eyebrow: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  products: z.array(productRefSchema).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(null);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('collections')
    .select(`
      id, slug, title, eyebrow, description, status, position,
      collection_products (
        position,
        products ( id, slug, title, price, status, authors(name), publishers(name), product_images(storage_path, type) )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const products = ((data as any).collection_products || [])
    .sort((a: any, b: any) => a.position - b.position)
    .map((cp: any) => {
      const p = cp.products;
      if (!p) return null;
      const cover = p.product_images?.find((img: any) => img.type === 'cover') || p.product_images?.[0];
      const coverUrl = cover?.storage_path
        ? (cover.storage_path.startsWith('http') ? cover.storage_path : `${supabaseUrl}/storage/v1/object/public/product-images/${cover.storage_path}`)
        : null;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        price: p.price,
        status: p.status,
        author: p.authors?.name || null,
        publisher: p.publishers?.name || null,
        coverUrl,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    id: data.id,
    slug: data.slug,
    title: data.title,
    eyebrow: data.eyebrow || '',
    description: data.description || '',
    status: data.status,
    position: data.position,
    products,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const id = params.id;
  const body = await request.json();
  const parsed = collectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((issue) => `Champ invalide : ${issue.path.join('.')} — ${issue.message}`).join(', ');
    return NextResponse.json({ error: errorMessages }, { status: 400 });
  }
  const data = parsed.data;
  const supabase = createAdminClient();

  const { data: current, error: fetchErr } = await supabase
    .from('collections')
    .select('id, slug, title, description')
    .eq('id', id)
    .single();
  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
  }

  if (data.status === 'published') {
    const descriptionAfterUpdate = 'description' in data ? data.description : current.description;
    if (!descriptionAfterUpdate?.trim()) {
      return NextResponse.json({ error: 'Une description est nécessaire pour publier une collection.' }, { status: 400 });
    }
  }

  let targetSlug = current.slug;
  if (data.slug && data.slug !== current.slug) {
    const requestedSlug = generateSlug(data.slug);
    const { data: checkSlug } = await supabase.from('collections').select('id').eq('slug', requestedSlug).neq('id', id).single();
    if (checkSlug) {
      return NextResponse.json({ error: `Le slug "${requestedSlug}" est déjà utilisé par une autre collection.` }, { status: 400 });
    }
    targetSlug = requestedSlug;
  }

  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.title) updatePayload.title = data.title;
  if (targetSlug !== current.slug) updatePayload.slug = targetSlug;
  if ('eyebrow' in data) updatePayload.eyebrow = data.eyebrow || null;
  if ('description' in data) updatePayload.description = data.description || null;
  if (data.status) updatePayload.status = data.status;

  const { error: updateErr } = await supabase.from('collections').update(updatePayload).eq('id', id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Association produits — remplacement complet, même schéma que les
  // images/variantes/thèmes produit : supprimer puis réinsérer dans l'ordre
  // fourni. Ne modifie jamais products.status — seule l'appartenance à la
  // collection change ; un produit brouillon reste un brouillon.
  if (Array.isArray(data.products)) {
    await supabase.from('collection_products').delete().eq('collection_id', id);
    if (data.products.length > 0) {
      const rows = data.products.map((p) => ({
        collection_id: id,
        product_id: p.productId,
        position: p.position,
      }));
      const { error: linkErr } = await supabase.from('collection_products').insert(rows as any);
      if (linkErr) {
        return NextResponse.json({ error: linkErr.message }, { status: 500 });
      }
    }
  }

  revalidateCollectionSurfaces(targetSlug);
  if (current.slug !== targetSlug) revalidateCollectionSurfaces(current.slug);

  return NextResponse.json({ success: true, slug: targetSlug });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase.from('collections').select('slug').eq('id', params.id).single();

  // `collection_products` cascades on collection deletion (see migration
  // 001) — this only ever removes the join rows, never a row in `products`.
  const { error } = await supabase.from('collections').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (target?.slug) revalidateCollectionSurfaces(target.slug);
  else revalidateCollectionSurfaces();

  return NextResponse.json({ success: true });
}
