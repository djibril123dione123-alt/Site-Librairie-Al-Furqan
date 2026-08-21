import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { z } from 'zod';
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

const imageSchema = z.object({
  id: z.string().optional(),
  storagePath: z.string(),
  type: z.string().optional(),
  position: z.number().optional(),
  altText: z.string().optional(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  attributes: z.string(),
  price: z.number().nullable().optional(),
  stock: z.number().nullable().optional(),
});

const productSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1, 'Titre requis'),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  authorId: z.string().optional(),
  publisher: z.string().optional(),
  publisherId: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.number().nullable().optional(),
  compareAtPrice: z.number().nullable().optional(),
  availability: z.string().optional(),
  stockQuantity: z.number().nullable().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  language: z.string().optional(),
  isbn: z.string().optional(),
  pages: z.number().nullable().optional(),
  dimensions: z.string().optional(),
  binding: z.string().optional(),
  edition: z.string().optional(),
  year: z.number().nullable().optional(),
  themes: z.array(z.string()).optional(),
  reading: z.string().optional(),
  tajwid: z.boolean().optional(),
  featured: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  color: z.string().optional(),
  hasVariants: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
  images: z.array(imageSchema).optional(),
});

// POST — créer un produit
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, id: 'dev-mode', message: 'Mode dev — non persisté' });
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = createAdminClient();

  // 1. Résolution Auteur
  let authorId: string | null = data.authorId || null;
  if (!authorId && data.author) {
    const authorSlug = generateSlug(data.author);
    const { data: existingAuthor } = await supabase.from('authors').select('id').eq('slug', authorSlug).single();
    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const { data: newAuthor } = await supabase.from('authors').insert({ name: data.author, slug: authorSlug } as any).select('id').single();
      authorId = newAuthor?.id || null;
    }
  }

  // 2. Résolution Éditeur
  let publisherId: string | null = data.publisherId || null;
  if (!publisherId && data.publisher) {
    const publisherSlug = generateSlug(data.publisher);
    const { data: existingPublisher } = await supabase.from('publishers').select('id').eq('slug', publisherSlug).single();
    if (existingPublisher) {
      publisherId = existingPublisher.id;
    } else {
      const { data: newPublisher } = await supabase.from('publishers').insert({ name: data.publisher, slug: publisherSlug } as any).select('id').single();
      publisherId = newPublisher?.id || null;
    }
  }

  // 3. Résolution Catégorie
  let categoryId: string | null = data.categoryId || null;
  if (!categoryId && data.category) {
    const categorySlug = generateSlug(data.category);
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    categoryId = cat?.id || null;
  }

  // 4. Générer slug unique
  const baseSlug = generateSlug(data.slug || data.title);
  let slug = baseSlug;
  const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).single();
  if (existing) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  // 5. Ajustement de disponibilité si stock = 0
  let dbAvailability = data.availability ? uiAvailabilityToDb(data.availability as any) : 'in_stock';
  if (data.stockQuantity === 0 && dbAvailability === 'in_stock') {
    dbAvailability = 'out_of_stock';
  }

  // 6. Insérer le produit principal
  const { data: product, error } = await supabase.from('products').insert({
    slug,
    title: data.title,
    subtitle: data.subtitle || null,
    short_description: data.shortDescription || null,
    description: data.description || null,
    price: data.price || null,
    compare_at_price: data.compareAtPrice || null,
    availability: dbAvailability,
    stock_quantity: data.stockQuantity || null,
    currency: 'XOF',
    status: data.status,
    language: data.language || null,
    isbn: data.isbn || null,
    pages: data.pages || null,
    dimensions: data.dimensions || null,
    binding: data.binding || null,
    edition: data.edition || null,
    publication_year: data.year || null,
    featured: data.featured || false,
    new_arrival: data.newArrival || false,
    restocked: false,
    has_variants: data.hasVariants || false,
    reading: data.reading || null,
    tajwid: data.tajwid || null,
    color: data.color || 'navy',
    ink: '#f7e6c4',
    author_id: authorId,
    publisher_id: publisherId,
    category_id: categoryId,
    published_at: data.status === 'published' ? new Date().toISOString() : null,
  } as any).select('id, slug').single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message || 'Erreur création produit' }, { status: 500 });
  }

  // 7. Persistance P0 des IMAGES dans product_images
  if (data.images && data.images.length > 0) {
    let coverAssigned = false;
    const imageRows = data.images.map((img, idx) => {
      let type = img.type || (idx === 0 ? 'cover' : 'inside');
      if (type === 'cover') {
        if (coverAssigned) type = 'inside';
        else coverAssigned = true;
      }
      return {
        product_id: product.id,
        storage_path: img.storagePath,
        type,
        position: img.position ?? idx,
        alt_text: img.altText || null,
      };
    });

    const { error: imgErr } = await supabase.from('product_images').insert(imageRows as any);
    if (imgErr) {
      console.error('Erreur insertion product_images:', imgErr);
    }
  }

  // 8. Persistance P0 des VARIANTES dans product_variants
  if (data.hasVariants && data.variants && data.variants.length > 0) {
    const variantRows = data.variants.map((v) => {
      const attrs: Record<string, string> = {};
      if (v.attributes) {
        v.attributes.split(',').forEach((pair) => {
          const [key, val] = pair.split(':').map((s) => s.trim());
          if (key && val) attrs[key] = val;
        });
      }
      return {
        product_id: product.id,
        attributes: attrs,
        price: v.price || null,
        stock_quantity: v.stock || null,
        availability: 'in_stock',
      };
    });
    await supabase.from('product_variants').insert(variantRows as any);
  }

  // 9. Persistance des THÈMES dans product_themes
  if (data.themes && data.themes.length > 0) {
    for (const themeName of data.themes) {
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
        await supabase.from('product_themes').insert({ product_id: product.id, theme_id: themeId } as any);
      }
    }
  }

  // Revalidation avec le slug réel du produit
  revalidatePath(`/livres/${product.slug}`);
  revalidatePath('/catalogue');
  revalidatePath('/');

  return NextResponse.json({ success: true, id: product.id, slug: product.slug });
}
