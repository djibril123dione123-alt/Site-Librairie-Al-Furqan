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

// GET single product
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
    .select('*, authors(name), publishers(name), categories(name), product_images(*), product_variants(*)')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
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

  // Résoudre auteur / éditeur si transmis sous forme de string
  let authorId = body.authorId || null;
  let publisherId = body.publisherId || null;
  let categoryId = null;

  if (body.author && !authorId) {
    const authorSlug = generateSlug(body.author);
    const { data: existingAuthor } = await supabase.from('authors').select('id').eq('slug', authorSlug).single();
    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const { data: newAuthor } = await supabase.from('authors').insert({ name: body.author, slug: authorSlug } as any).select('id').single();
      authorId = newAuthor?.id || null;
    }
  }

  if (body.publisher && !publisherId) {
    const publisherSlug = generateSlug(body.publisher);
    const { data: existingPublisher } = await supabase.from('publishers').select('id').eq('slug', publisherSlug).single();
    if (existingPublisher) {
      publisherId = existingPublisher.id;
    } else {
      const { data: newPublisher } = await supabase.from('publishers').insert({ name: body.publisher, slug: publisherSlug } as any).select('id').single();
      publisherId = newPublisher?.id || null;
    }
  }

  if (body.category) {
    const categorySlug = generateSlug(body.category);
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    categoryId = cat?.id || null;
  }

  const dbAvailability = body.availability ? uiAvailabilityToDb(body.availability as any) : 'in_stock';

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.title) updatePayload.title = body.title;
  if ('subtitle' in body) updatePayload.subtitle = body.subtitle || null;
  if ('shortDescription' in body) updatePayload.short_description = body.shortDescription || null;
  if ('description' in body) updatePayload.description = body.description || null;
  if ('price' in body) updatePayload.price = body.price || null;
  if ('compareAtPrice' in body) updatePayload.compare_at_price = body.compareAtPrice || null;
  if (body.availability) updatePayload.availability = dbAvailability;
  if ('stockQuantity' in body) updatePayload.stock_quantity = body.stockQuantity || null;
  if (body.status) updatePayload.status = body.status;
  if ('language' in body) updatePayload.language = body.language || null;
  if ('isbn' in body) updatePayload.isbn = body.isbn || null;
  if ('pages' in body) updatePayload.pages = body.pages || null;
  if ('dimensions' in body) updatePayload.dimensions = body.dimensions || null;
  if ('binding' in body) updatePayload.binding = body.binding || null;
  if ('edition' in body) updatePayload.edition = body.edition || null;
  if ('year' in body) updatePayload.publication_year = body.year || null;
  if ('featured' in body) updatePayload.featured = body.featured;
  if ('newArrival' in body) updatePayload.new_arrival = body.newArrival;
  if ('hasVariants' in body) updatePayload.has_variants = body.hasVariants;
  if ('reading' in body) updatePayload.reading = body.reading || null;
  if ('tajwid' in body) updatePayload.tajwid = body.tajwid || null;
  if ('color' in body) updatePayload.color = body.color || 'navy';
  if (authorId) updatePayload.author_id = authorId;
  if (publisherId) updatePayload.publisher_id = publisherId;
  if (categoryId) updatePayload.category_id = categoryId;
  if (body.status === 'published') updatePayload.published_at = new Date().toISOString();

  const { error } = await supabase.from('products').update(updatePayload).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mettre à jour les variantes si transmises
  if (body.hasVariants && Array.isArray(body.variants)) {
    await supabase.from('product_variants').delete().eq('product_id', id);
    const variantRows = body.variants.map((v: any) => {
      const attrs: Record<string, string> = {};
      if (typeof v.attributes === 'string') {
        v.attributes.split(',').forEach((pair: string) => {
          const [key, val] = pair.split(':').map((s) => s.trim());
          if (key && val) attrs[key] = val;
        });
      }
      return {
        product_id: id,
        attributes: attrs,
        price: v.price || null,
        stock_quantity: v.stock || null,
        availability: 'in_stock',
      };
    });
    if (variantRows.length > 0) {
      await supabase.from('product_variants').insert(variantRows as any);
    }
  }

  // Mettre à jour les images si transmises
  if (Array.isArray(body.images) && body.images.length > 0) {
    await supabase.from('product_images').delete().eq('product_id', id);
    const imageRows = body.images.map((img: any, idx: number) => ({
      product_id: id,
      storage_path: img.storagePath,
      type: img.type || (idx === 0 ? 'cover' : 'inside'),
      position: idx,
    }));
    await supabase.from('product_images').insert(imageRows as any);
  }

  revalidatePath(`/livres/${id}`);
  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');

  return NextResponse.json({ success: true });
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
  const { error } = await supabase.from('products').update({ status: 'archived' } as any).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/catalogue');
  revalidatePath('/admin/produits');

  return NextResponse.json({ success: true });
}
