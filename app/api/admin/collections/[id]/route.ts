import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { z } from 'zod';
import { revalidateCollectionSurfaces } from '@/lib/data/revalidate-collection';
import { hasAtLeastOnePublishedProduct } from '@/lib/supabase/collection-validation';

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

// Service-role backed, includes draft product associations regardless of
// status — admin-gated like every other verb here (Phase L.1 §16).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

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

    // Effective product set after this save: the payload's if it's
    // touching associations, otherwise whatever is already linked — never
    // trust the client picker's own idea of each product's status, only
    // the DB's current one (Phase L.1 §21).
    let effectiveProductIds: string[];
    if (Array.isArray(data.products)) {
      effectiveProductIds = data.products.map((p) => p.productId);
    } else {
      const { data: existingLinks } = await supabase.from('collection_products').select('product_id').eq('collection_id', id);
      effectiveProductIds = (existingLinks || []).map((l: any) => l.product_id);
    }
    if (!(await hasAtLeastOnePublishedProduct(supabase, effectiveProductIds))) {
      return NextResponse.json({ error: 'Associez au moins un livre publié avant de publier cette collection.' }, { status: 400 });
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

  // Association produits — réconciliation non-destructive plutôt qu'un
  // vidage puis réinsertion : la sélection valide existante ne doit jamais
  // disparaître simplement parce que le remplacement échoue (Phase L.1
  // §20). On UPSERT d'abord l'ensemble désiré (ajoute les nouveaux, met à
  // jour la position des existants) — si ça échoue, rien n'a encore été
  // retiré. Seulement ensuite on supprime les associations qui ne sont
  // plus désirées ; si CETTE étape échoue, l'état obtenu est un
  // sur-ensemble (quelques associations en trop), jamais un état vide.
  // Ne modifie jamais products.status — seule l'appartenance à la
  // collection change ; un produit brouillon reste un brouillon.
  if (Array.isArray(data.products)) {
    const { data: existingLinksForPrune } = await supabase
      .from('collection_products')
      .select('product_id')
      .eq('collection_id', id);
    const existingIds = new Set((existingLinksForPrune || []).map((l: any) => l.product_id));
    const desiredIds = new Set(data.products.map((p) => p.productId));

    if (data.products.length > 0) {
      const rows = data.products.map((p) => ({
        collection_id: id,
        product_id: p.productId,
        position: p.position,
      }));
      const { error: upsertErr } = await supabase
        .from('collection_products')
        .upsert(rows as any, { onConflict: 'collection_id,product_id' });
      if (upsertErr) {
        return NextResponse.json({ error: `Erreur lors de l'association des livres : ${upsertErr.message}` }, { status: 500 });
      }
    }

    const toRemove = Array.from(existingIds).filter((pid) => !desiredIds.has(pid as string));
    if (toRemove.length > 0) {
      const { error: pruneErr } = await supabase
        .from('collection_products')
        .delete()
        .eq('collection_id', id)
        .in('product_id', toRemove);
      if (pruneErr) {
        return NextResponse.json({
          error: `Les livres sélectionnés ont été enregistrés, mais d'anciennes associations n'ont pas pu être retirées : ${pruneErr.message}`,
        }, { status: 500 });
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
