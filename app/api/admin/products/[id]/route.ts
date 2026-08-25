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

// GET single product with full relational payload
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // 6. Synchronisation IMAGES
  if (Array.isArray(body.images)) {
    const { data: oldImages } = await supabase
      .from('product_images')
      .select('id, storage_path, original_storage_path')
      .eq('product_id', id);

    const newPaths = new Set(body.images.map((img: any) => img.storagePath));

    if (oldImages && oldImages.length > 0) {
      const removedImages = oldImages.filter((oldImg: any) => !newPaths.has(oldImg.storage_path));
      for (const removed of removedImages) {
        await supabase.from('product_images').delete().eq('id', removed.id);

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
    }

    await supabase.from('product_images').delete().eq('product_id', id);
    let coverAssigned = false;
    const newImageRows = [];

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

      newImageRows.push({
        product_id: id,
        storage_path,
        // Round-tripped so a normal form save (title edit, reorder, etc.)
        // never wipes a crop already applied via the dedicated crop
        // endpoint — this block deletes and reinserts every image row on
        // every save, so anything not explicitly carried through here is
        // silently lost.
        original_storage_path: img.originalStoragePath || null,
        crop_data: img.cropData || null,
        type,
        position: img.position ?? idx,
        alt_text: img.altText || null,
      });
    }

    if (newImageRows.length > 0) {
      await supabase.from('product_images').insert(newImageRows as any);
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

  return NextResponse.json({ success: true, slug: targetSlug });
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
    // so both are safe to remove together with the product.
    const { data: images } = await supabase.from('product_images').select('storage_path, original_storage_path').eq('product_id', params.id);
    if (images && images.length > 0) {
      const paths = Array.from(
        new Set(images.flatMap((i: any) => [i.storage_path, i.original_storage_path]).filter(Boolean))
      );
      if (paths.length > 0) {
        await supabase.storage.from('product-images').remove(paths);
      }
    }
    await supabase.from('products').delete().eq('id', params.id);
  } else {
    await supabase.from('products').update({ status: 'archived' } as any).eq('id', params.id);
  }

  if (targetProduct?.slug) {
    revalidateProductSurfaces(targetProduct.slug);
  }

  return NextResponse.json({ success: true });
}
