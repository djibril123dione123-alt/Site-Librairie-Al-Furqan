import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { revalidatePath } from 'next/cache';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
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

  // Tri garanti des images par position ASC
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
    .select('id, slug, status, author_id, publisher_id, category_id')
    .eq('id', id)
    .single();

  if (fetchErr || !currentProduct) {
    return NextResponse.json({ error: 'Produit introuvable en base' }, { status: 404 });
  }

  // 2. Résolution Auteur / Éditeur / Catégorie
  let authorId = body.authorId !== undefined ? (body.authorId || null) : currentProduct.author_id;
  if (!authorId && body.author) {
    const authorSlug = generateSlug(body.author);
    const { data: existingAuthor } = await supabase.from('authors').select('id').eq('slug', authorSlug).single();
    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const { data: newAuthor } = await supabase.from('authors').insert({ name: body.author, slug: authorSlug } as any).select('id').single();
      authorId = newAuthor?.id || null;
    }
  }

  let publisherId = body.publisherId !== undefined ? (body.publisherId || null) : currentProduct.publisher_id;
  if (!publisherId && body.publisher) {
    const publisherSlug = generateSlug(body.publisher);
    const { data: existingPublisher } = await supabase.from('publishers').select('id').eq('slug', publisherSlug).single();
    if (existingPublisher) {
      publisherId = existingPublisher.id;
    } else {
      const { data: newPublisher } = await supabase.from('publishers').insert({ name: body.publisher, slug: publisherSlug } as any).select('id').single();
      publisherId = newPublisher?.id || null;
    }
  }

  let categoryId = body.categoryId !== undefined ? (body.categoryId || null) : currentProduct.category_id;
  if (!categoryId && body.category) {
    const categorySlug = generateSlug(body.category);
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    categoryId = cat?.id || null;
  }

  // 3. Gestion prudente du Slug : ne change que si explicite et unique
  let targetSlug = currentProduct.slug;
  if (body.slug && body.slug !== currentProduct.slug) {
    const requestedSlug = generateSlug(body.slug);
    const { data: checkSlug } = await supabase.from('products').select('id').eq('slug', requestedSlug).neq('id', id).single();
    if (checkSlug) {
      return NextResponse.json({ error: `Le slug "${requestedSlug}" est déjà utilisé par un autre ouvrage.` }, { status: 400 });
    }
    targetSlug = requestedSlug;
  }

  // 4. Ajustement stock & disponibilité
  let dbAvailability = body.availability ? uiAvailabilityToDb(body.availability as any) : undefined;
  if (body.stockQuantity === 0 && dbAvailability === 'in_stock') {
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
  if ('price' in body) updatePayload.price = body.price !== null ? Number(body.price) : null;
  if ('compareAtPrice' in body) updatePayload.compare_at_price = body.compareAtPrice !== null ? Number(body.compareAtPrice) : null;
  if (dbAvailability) updatePayload.availability = dbAvailability;
  if ('stockQuantity' in body) updatePayload.stock_quantity = body.stockQuantity !== null ? Number(body.stockQuantity) : null;
  if (body.status) updatePayload.status = body.status;
  if ('language' in body) updatePayload.language = body.language || null;
  if ('isbn' in body) updatePayload.isbn = body.isbn || null;
  if ('pages' in body) updatePayload.pages = body.pages !== null ? Number(body.pages) : null;
  if ('dimensions' in body) updatePayload.dimensions = body.dimensions || null;
  if ('binding' in body) updatePayload.binding = body.binding || null;
  if ('edition' in body) updatePayload.edition = body.edition || null;
  if ('year' in body) updatePayload.publication_year = body.year !== null ? Number(body.year) : null;
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

  // 6. Synchronisation P0 des IMAGES (product_images & Nettoyage Storage)
  if (Array.isArray(body.images)) {
    // Récupérer les anciennes images pour détecter celles supprimées
    const { data: oldImages } = await supabase
      .from('product_images')
      .select('id, storage_path')
      .eq('product_id', id);

    const newPaths = new Set(body.images.map((img: any) => img.storagePath));

    // Supprimer de product_images les images absentes du nouveau payload
    if (oldImages && oldImages.length > 0) {
      const removedImages = oldImages.filter((oldImg: any) => !newPaths.has(oldImg.storage_path));
      for (const removed of removedImages) {
        await supabase.from('product_images').delete().eq('id', removed.id);
        
        // Vérifier si le fichier Storage est orphelin
        const { count } = await supabase
          .from('product_images')
          .select('*', { count: 'exact', head: true })
          .eq('storage_path', removed.storage_path);

        if ((count ?? 0) === 0 && removed.storage_path) {
          await supabase.storage.from('product-images').remove([removed.storage_path]);
        }
      }
    }

    // Ré-insérer l'état propre des images avec garantie de 1 seule couverture principale
    await supabase.from('product_images').delete().eq('product_id', id);
    let coverAssigned = false;
    const newImageRows = body.images.map((img: any, idx: number) => {
      let type = img.type || (idx === 0 ? 'cover' : 'inside');
      if (type === 'cover') {
        if (coverAssigned) type = 'inside';
        else coverAssigned = true;
      }
      return {
        product_id: id,
        storage_path: img.storagePath,
        type,
        position: img.position ?? idx,
        alt_text: img.altText || null,
      };
    });

    if (newImageRows.length > 0) {
      await supabase.from('product_images').insert(newImageRows as any);
    }
  }

  // 7. Synchronisation P0 des VARIANTES (product_variants)
  // Ne remplacer les variantes QUE si has_variants=true ET le tableau variants est explicite
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
        price: v.price !== null && v.price !== '' ? Number(v.price) : null,
        stock_quantity: v.stock !== null && v.stock !== '' ? Number(v.stock) : null,
        availability: 'in_stock',
      };
    });

    if (variantRows.length > 0) {
      await supabase.from('product_variants').insert(variantRows as any);
    }
  }

  // 8. Synchronisation des THÈMES (product_themes)
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

  // Revalidation avec le slug réel du produit
  revalidatePath(`/livres/${targetSlug}`);
  revalidatePath('/catalogue');
  revalidatePath('/');

  return NextResponse.json({ success: true, slug: targetSlug });
}

// DELETE archive / delete product
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

  // Si suppression physique demandée via query param ?hard=true (pour le cleanup QA)
  const url = new URL(request.url);
  const hardDelete = url.searchParams.get('hard') === 'true';

  if (hardDelete) {
    // Supprimer les images du storage
    const { data: images } = await supabase.from('product_images').select('storage_path').eq('product_id', params.id);
    if (images && images.length > 0) {
      const paths = images.map((i: any) => i.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('product-images').remove(paths);
      }
    }
    // Suppression physique (cascade supprime variants & images)
    await supabase.from('products').delete().eq('id', params.id);
  } else {
    // Sinon archivage doux
    await supabase.from('products').update({ status: 'archived' } as any).eq('id', params.id);
  }

  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');

  return NextResponse.json({ success: true });
}
