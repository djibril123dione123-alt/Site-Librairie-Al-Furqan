import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { revalidateProductSurfaces } from '@/lib/data/revalidate-product';
import { resolveOrCreateEntityId } from '@/lib/supabase/entity-dedupe';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// GET single product with full relational payload — service-role backed,
// returns draft/archived rows and every internal field regardless of
// publication status, so this is privileged data and must be admin-gated
// like every other verb on this route (Phase L.1 §16 audit finding).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json(null);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      authors(id, name, slug),
      publishers(id, name, slug),
      categories(id, name, slug),
      product_images(*),
      product_variants(*),
      product_themes(themes(id, name))
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });

  if (Array.isArray(data.product_images)) {
    data.product_images.sort((a: any, b: any) => a.position - b.position);
  }

  return NextResponse.json(data);
}

// PUT update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, message: 'Mode dev — non persisté' });
  }

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const body = await request.json();
  const supabase = createAdminClient();

  // 1. Récupérer le produit actuel
  const { data: currentProduct, error: fetchErr } = await supabase
    .from('products')
    .select('id, slug, title, status, author_id, publisher_id, category_id')
    .eq('id', id)
    .single();

  if (fetchErr || !currentProduct) {
    return NextResponse.json({ error: 'Produit introuvable en base' }, { status: 404 });
  }

  // Validation de PUBLICATION
  if (body.status === 'published') {
    if (!body.category && !body.categoryId) {
      return NextResponse.json({ error: 'Une catégorie est obligatoire pour publier un livre.' }, { status: 400 });
    }
    const priceNum = parseNumberOrNull(body.price);
    if (priceNum === null) {
      return NextResponse.json({ error: 'Un prix de vente valide est obligatoire pour publier un livre.' }, { status: 400 });
    }
    const stockNum = parseNumberOrNull(body.stockQuantity);
    if (stockNum === null) {
      return NextResponse.json({ error: 'La quantité en stock doit être renseignée pour publier un livre.' }, { status: 400 });
    }
    // `body.images` reflects the full intended set only when the client
    // actually sent one (see the images-sync block below) — when it's
    // absent this save isn't touching images, so the cover already
    // persisted in the DB (if any) still applies.
    let hasCover: boolean;
    if (Array.isArray(body.images)) {
      hasCover = body.images.some((img: any) => img.type === 'cover' && img.storagePath);
    } else {
      const { count } = await supabase
        .from('product_images')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('type', 'cover');
      hasCover = (count ?? 0) > 0;
    }
    if (!hasCover) {
      return NextResponse.json({ error: 'Ajoutez une couverture avant de publier ce livre.' }, { status: 400 });
    }
    const titleForCheck = body.title || currentProduct.title;
    if (/\(copie\)/i.test(titleForCheck)) {
      return NextResponse.json({ error: 'Renommez cette copie avant de la publier.' }, { status: 400 });
    }
  }

  // 2. Résolution Auteur / Éditeur / Catégorie
  let authorId = body.authorId !== undefined ? (body.authorId || null) : currentProduct.author_id;
  if (!authorId && body.author) {
    authorId = await resolveOrCreateEntityId(supabase, 'authors', body.author);
  }

  let publisherId = body.publisherId !== undefined ? (body.publisherId || null) : currentProduct.publisher_id;
  if (!publisherId && body.publisher) {
    publisherId = await resolveOrCreateEntityId(supabase, 'publishers', body.publisher);
  }

  let categoryId = body.categoryId !== undefined ? (body.categoryId || null) : currentProduct.category_id;
  if (!categoryId && body.category) {
    const categorySlug = generateSlug(body.category);
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    categoryId = cat?.id || null;
  }

  // 3. Gestion du Slug
  let targetSlug = currentProduct.slug;
  if (body.slug && body.slug !== currentProduct.slug) {
    const requestedSlug = generateSlug(body.slug);
    const { data: checkSlug } = await supabase.from('products').select('id').eq('slug', requestedSlug).neq('id', id).single();
    if (checkSlug) {
      return NextResponse.json({ error: `Le slug "${requestedSlug}" est déjà utilisé par un autre ouvrage.` }, { status: 400 });
    }
    targetSlug = requestedSlug;
  }

  // 4. Ajustement stock & disponibilité (en préservant 0)
  const stockQuantity = parseNumberOrNull(body.stockQuantity);
  let dbAvailability = body.availability ? uiAvailabilityToDb(body.availability as any) : undefined;
  
  if (stockQuantity === 0) {
    dbAvailability = 'out_of_stock';
  }

  // 5. Payload de mise à jour produit
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title) updatePayload.title = body.title;
  if (targetSlug !== currentProduct.slug) updatePayload.slug = targetSlug;
  if ('subtitle' in body) updatePayload.subtitle = body.subtitle || null;
  if ('shortDescription' in body) updatePayload.short_description = body.shortDescription || null;
  if ('description' in body) updatePayload.description = body.description || null;
  if ('price' in body) updatePayload.price = parseNumberOrNull(body.price);
  if ('compareAtPrice' in body) updatePayload.compare_at_price = parseNumberOrNull(body.compareAtPrice);
  if (dbAvailability) updatePayload.availability = dbAvailability;
  if ('stockQuantity' in body) updatePayload.stock_quantity = stockQuantity;
  if ('weightG' in body) updatePayload.weight_g = parseNumberOrNull(body.weightG);
  if (body.status) updatePayload.status = body.status;
  if ('language' in body) updatePayload.language = body.language || null;
  if ('isbn' in body) updatePayload.isbn = body.isbn || null;
  if ('pages' in body) updatePayload.pages = parseNumberOrNull(body.pages);
  if ('dimensions' in body) updatePayload.dimensions = body.dimensions || null;
  if ('binding' in body) updatePayload.binding = body.binding || null;
  if ('edition' in body) updatePayload.edition = body.edition || null;
  if ('year' in body) updatePayload.publication_year = parseNumberOrNull(body.year);
  if ('featured' in body) updatePayload.featured = body.featured;
  if ('newArrival' in body) updatePayload.new_arrival = body.newArrival;
  if ('hasVariants' in body) updatePayload.has_variants = body.hasVariants;
  if ('reading' in body) updatePayload.reading = body.reading || null;
  if ('tajwid' in body) updatePayload.tajwid = body.tajwid || null;
  if ('color' in body) updatePayload.color = body.color || 'navy';
  
  updatePayload.author_id = authorId;
  updatePayload.publisher_id = publisherId;
  updatePayload.category_id = categoryId;
  
  if (body.status === 'published' && currentProduct.status !== 'published') {
    updatePayload.published_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase.from('products').update(updatePayload).eq('id', id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 6. Synchronisation IMAGES — réconciliation par id, jamais un vidage
  // complet : une ligne existante garde son id (le crop editor s'appuie
  // dessus, et product_variants.image_id pointe dessus via ON DELETE SET
  // NULL) à travers un simple changement de titre/prix/catégorie. Voir
  // Phase L.1 §1-5.
  let canonicalImages: Array<{
    id: string;
    storagePath: string;
    originalStoragePath: string | null;
    cropData: any;
    type: string;
    position: number;
    altText: string | null;
  }> = [];

  if (Array.isArray(body.images)) {
    const { data: oldImages, error: oldImagesErr } = await supabase
      .from('product_images')
      .select('id, storage_path, original_storage_path')
      .eq('product_id', id);

    if (oldImagesErr) {
      return NextResponse.json({ error: 'Erreur lors de la lecture des images existantes.' }, { status: 500 });
    }

    const oldById = new Map((oldImages || []).map((img: any) => [img.id, img]));

    // Toute id fournie par le client doit appartenir à CE produit — sinon
    // on refuse plutôt que de deviner (ex: réattribuer par erreur la ligne
    // d'un autre produit).
    for (const img of body.images) {
      if (img.id && !oldById.has(img.id)) {
        return NextResponse.json({ error: `Image ${img.id} introuvable pour ce produit.` }, { status: 400 });
      }
    }

    const keptIds = new Set(body.images.map((img: any) => img.id).filter(Boolean));
    const removedImages = (oldImages || []).filter((oldImg: any) => !keptIds.has(oldImg.id));

    for (const removed of removedImages) {
      const { error: delErr } = await supabase.from('product_images').delete().eq('id', removed.id);
      if (delErr) {
        return NextResponse.json({ error: `Erreur lors de la suppression d'une image : ${delErr.message}` }, { status: 500 });
      }

      // A removed image may carry a crop lineage of its own (a derivative
      // AND an untouched original) — both are candidates for cleanup,
      // each checked independently so one being still-referenced never
      // blocks cleaning the other.
      const candidatePaths = Array.from(
        new Set([removed.storage_path, removed.original_storage_path].filter(Boolean))
      ) as string[];
      for (const candidate of candidatePaths) {
        const { count } = await supabase
          .from('product_images')
          .select('*', { count: 'exact', head: true })
          .or(`storage_path.eq.${candidate},original_storage_path.eq.${candidate}`);
        if ((count ?? 0) === 0) {
          await supabase.storage.from('product-images').remove([candidate]);
        }
      }
    }

    let coverAssigned = false;
    for (let idx = 0; idx < body.images.length; idx++) {
      const img = body.images[idx];
      let type = img.type || (idx === 0 ? 'cover' : 'inside');
      if (type === 'cover') {
        if (coverAssigned) type = 'inside';
        else coverAssigned = true;
      }

      let storage_path = img.storagePath;
      if (storage_path && storage_path.startsWith('temp/')) {
        const filename = storage_path.split('/').pop();
        const newPath = `${id}/${filename}`;
        const { error: moveError } = await supabase.storage.from('product-images').move(storage_path, newPath);
        if (!moveError) {
          storage_path = newPath;
        }
      }

      if (img.id) {
        // Ligne existante : on ne touche JAMAIS original_storage_path ni
        // crop_data ici — ces deux colonnes n'appartiennent qu'aux routes
        // /crop et /crop/reset. Un enregistrement générique du formulaire
        // ne peut donc structurellement jamais les altérer.
        const { data: updated, error: updErr } = await supabase
          .from('product_images')
          .update({ storage_path, type, position: img.position ?? idx, alt_text: img.altText || null } as any)
          .eq('id', img.id)
          .select('id, storage_path, original_storage_path, crop_data, type, position, alt_text')
          .single();
        if (updErr || !updated) {
          return NextResponse.json({ error: `Erreur lors de la mise à jour d'une image : ${updErr?.message || 'inconnue'}` }, { status: 500 });
        }
        canonicalImages.push({
          id: updated.id,
          storagePath: updated.storage_path,
          originalStoragePath: updated.original_storage_path,
          cropData: updated.crop_data,
          type: updated.type,
          position: updated.position,
          altText: updated.alt_text,
        });
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('product_images')
          .insert({
            product_id: id,
            storage_path,
            original_storage_path: img.originalStoragePath || null,
            crop_data: img.cropData || null,
            type,
            position: img.position ?? idx,
            alt_text: img.altText || null,
          } as any)
          .select('id, storage_path, original_storage_path, crop_data, type, position, alt_text')
          .single();
        if (insErr || !inserted) {
          return NextResponse.json({ error: `Erreur lors de l'ajout d'une image : ${insErr?.message || 'inconnue'}` }, { status: 500 });
        }
        canonicalImages.push({
          id: inserted.id,
          storagePath: inserted.storage_path,
          originalStoragePath: inserted.original_storage_path,
          cropData: inserted.crop_data,
          type: inserted.type,
          position: inserted.position,
          altText: inserted.alt_text,
        });
      }
    }
  }

  // 7. Synchronisation VARIANTES (en préservant 0 pour les sous-champs)
  if (body.hasVariants === false) {
    await supabase.from('product_variants').delete().eq('product_id', id);
  } else if (body.hasVariants === true && Array.isArray(body.variants)) {
    await supabase.from('product_variants').delete().eq('product_id', id);
    const variantRows = body.variants.map((v: any) => {
      const attrs: Record<string, string> = {};
      if (typeof v.attributes === 'string') {
        v.attributes.split(',').forEach((pair: string) => {
          const [key, val] = pair.split(':').map((s) => s.trim());
          if (key && val) attrs[key] = val;
        });
      } else if (v.attributes && typeof v.attributes === 'object') {
        Object.assign(attrs, v.attributes);
      }
      return {
        product_id: id,
        attributes: attrs,
        price: parseNumberOrNull(v.price),
        stock_quantity: parseNumberOrNull(v.stock),
        availability: 'in_stock',
      };
    });

    if (variantRows.length > 0) {
      await supabase.from('product_variants').insert(variantRows as any);
    }
  }

  // 8. Synchronisation THÈMES
  if (Array.isArray(body.themes)) {
    await supabase.from('product_themes').delete().eq('product_id', id);
    for (const themeName of body.themes) {
      if (!themeName.trim()) continue;
      const themeSlug = generateSlug(themeName);
      let themeId: string | null = null;
      const { data: existingTheme } = await supabase.from('themes').select('id').eq('slug', themeSlug).single();
      if (existingTheme) {
        themeId = existingTheme.id;
      } else {
        const { data: newTheme } = await supabase.from('themes').insert({ name: themeName.trim(), slug: themeSlug } as any).select('id').single();
        themeId = newTheme?.id || null;
      }
      if (themeId) {
        await supabase.from('product_themes').insert({ product_id: id, theme_id: themeId } as any);
      }
    }
  }

  revalidateProductSurfaces(targetSlug);

  // Canonical images (when this save touched them) — the client updates
  // its local state from this response instead of trusting its own
  // pre-save ids/paths or waiting on router.refresh() to repair them
  // (Phase L.1 §5).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const toPublicUrl = (path: string) =>
    path.startsWith('http') ? path : `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
  const imagesResponse = Array.isArray(body.images)
    ? canonicalImages
        .sort((a, b) => a.position - b.position)
        .map((img) => ({
          ...img,
          publicUrl: toPublicUrl(img.storagePath),
          originalUrl: toPublicUrl(img.originalStoragePath || img.storagePath),
        }))
    : undefined;

  return NextResponse.json({ success: true, slug: targetSlug, images: imagesResponse });
}

// DELETE product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const hardDelete = url.searchParams.get('hard') === 'true';

  const { data: targetProduct } = await supabase.from('products').select('slug').eq('id', params.id).single();

  if (hardDelete) {
    // A cropped cover owns two storage objects (the derivative in
    // storage_path, the untouched original in original_storage_path) —
    // both are being namespaced under this product's own storage folder,
    // so both are safe to remove together with the product. Collected
    // BEFORE the DB delete, but only actually removed from Storage AFTER
    // the DB delete is confirmed — a failed DB delete must leave every
    // file untouched (Phase L.1 §7).
    const { data: images } = await supabase
      .from('product_images')
      .select('storage_path, original_storage_path')
      .eq('product_id', params.id);
    const paths = Array.from(
      new Set((images || []).flatMap((i: any) => [i.storage_path, i.original_storage_path]).filter(Boolean))
    );

    const { error: deleteErr, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', params.id);

    if (deleteErr) {
      return NextResponse.json({ error: `Erreur lors de la suppression du produit : ${deleteErr.message}` }, { status: 500 });
    }
    if (!count) {
      // Nothing was actually deleted (already gone, or id mismatch) —
      // never claim success, and never touch Storage for a delete that
      // didn't happen.
      return NextResponse.json({ error: 'Produit introuvable — rien n\'a été supprimé.' }, { status: 404 });
    }

    if (paths.length > 0) {
      // Best-effort: Storage rows can't un-delete the product row that's
      // already gone, so a cleanup failure here is reported but doesn't
      // turn a genuinely successful product deletion into an error.
      const { error: storageErr } = await supabase.storage.from('product-images').remove(paths);
      if (storageErr) {
        if (targetProduct?.slug) revalidateProductSurfaces(targetProduct.slug);
        return NextResponse.json({
          success: true,
          warning: `Produit supprimé, mais certains fichiers n'ont pas pu être nettoyés : ${storageErr.message}`,
        });
      }
    }
  } else {
    const { error: archiveErr } = await supabase.from('products').update({ status: 'archived' } as any).eq('id', params.id);
    if (archiveErr) {
      return NextResponse.json({ error: `Erreur lors de l'archivage : ${archiveErr.message}` }, { status: 500 });
    }
  }

  if (targetProduct?.slug) {
    revalidateProductSurfaces(targetProduct.slug);
  }

  return NextResponse.json({ success: true });
}
