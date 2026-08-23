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

function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const imageSchema = z.object({
  id: z.string().optional(),
  storagePath: z.string(),
  type: z.string().optional(),
  position: z.number().optional(),
  altText: z.string().nullable().optional(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  attributes: z.string(),
  price: z.union([z.number(), z.string()]).nullable().optional(),
  stock: z.union([z.number(), z.string()]).nullable().optional(),
});

const productSchema = z.object({
  slug: z.string().nullable().optional(),
  title: z.string().min(1, 'Titre requis'),
  subtitle: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  authorId: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  publisherId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  price: z.union([z.number(), z.string()]).nullable().optional(),
  compareAtPrice: z.union([z.number(), z.string()]).nullable().optional(),
  availability: z.string().nullable().optional(),
  stockQuantity: z.union([z.number(), z.string()]).nullable().optional(),
  weightG: z.union([z.number(), z.string()]).nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  pages: z.union([z.number(), z.string()]).nullable().optional(),
  dimensions: z.string().nullable().optional(),
  binding: z.string().nullable().optional(),
  edition: z.string().nullable().optional(),
  year: z.union([z.number(), z.string()]).nullable().optional(),
  themes: z.array(z.string()).nullable().optional(),
  reading: z.string().nullable().optional(),
  tajwid: z.boolean().nullable().optional(),
  featured: z.boolean().nullable().optional(),
  newArrival: z.boolean().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  color: z.string().nullable().optional(),
  hasVariants: z.boolean().nullable().optional(),
  variants: z.array(variantSchema).nullable().optional(),
  images: z.array(imageSchema).nullable().optional(),
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
    const errorMessages = parsed.error.issues.map(issue => `Champ invalide : ${issue.path.join('.')} — ${issue.message}`).join(', ');
    return NextResponse.json({ error: errorMessages }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = createAdminClient();

  // Validation stricte pour la PUBLICATION
  if (data.status === 'published') {
    if (!data.category && !data.categoryId) {
      return NextResponse.json({ error: 'Une catégorie est obligatoire pour publier un livre.' }, { status: 400 });
    }
    const priceNum = parseNumberOrNull(data.price);
    if (priceNum === null) {
      return NextResponse.json({ error: 'Un prix de vente valide est obligatoire pour publier un livre.' }, { status: 400 });
    }
    const stockNum = parseNumberOrNull(data.stockQuantity);
    if (stockNum === null) {
      return NextResponse.json({ error: 'La quantité en stock doit être renseignée pour publier un livre.' }, { status: 400 });
    }
  }

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

  // 5. Règle de disponibilité et stock
  const stockQuantity = parseNumberOrNull(data.stockQuantity);
  let dbAvailability = data.availability ? uiAvailabilityToDb(data.availability as any) : 'in_stock';
  
  if (stockQuantity === 0) {
    dbAvailability = 'out_of_stock';
  } else if (stockQuantity !== null && stockQuantity >= 1 && stockQuantity <= 3 && data.availability !== 'Indisponible temporairement') {
    dbAvailability = 'in_stock'; // Mappé sur low_stock au niveau UI
  }

  // 6. Insérer le produit principal (en préservant 0)
  const { data: product, error } = await supabase.from('products').insert({
    slug,
    title: data.title,
    subtitle: data.subtitle || null,
    short_description: data.shortDescription || null,
    description: data.description || null,
    price: parseNumberOrNull(data.price),
    compare_at_price: parseNumberOrNull(data.compareAtPrice),
    availability: dbAvailability,
    stock_quantity: stockQuantity,
    weight_g: parseNumberOrNull(data.weightG),
    currency: 'XOF',
    status: data.status,
    language: data.language || null,
    isbn: data.isbn || null,
    pages: parseNumberOrNull(data.pages),
    dimensions: data.dimensions || null,
    binding: data.binding || null,
    edition: data.edition || null,
    publication_year: parseNumberOrNull(data.year),
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

  // 7. Images
  if (data.images && data.images.length > 0) {
    let coverAssigned = false;
    const imageRows = [];
    
    for (let idx = 0; idx < data.images.length; idx++) {
      const img = data.images[idx];
      let type = img.type || (idx === 0 ? 'cover' : 'inside');
      if (type === 'cover') {
        if (coverAssigned) type = 'inside';
        else coverAssigned = true;
      }
      
      let storage_path = img.storagePath;
      if (storage_path && storage_path.startsWith('temp/')) {
        const filename = storage_path.split('/').pop();
        const newPath = `${product.id}/${filename}`;
        const { error: moveError } = await supabase.storage.from('product-images').move(storage_path, newPath);
        if (!moveError) {
          storage_path = newPath;
        }
      }

      imageRows.push({
        product_id: product.id,
        storage_path,
        type,
        position: img.position ?? idx,
        alt_text: img.altText || null,
      });
    }

    await supabase.from('product_images').insert(imageRows as any);
  }

  // 8. Variantes (en préservant 0 pour le stock et prix)
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
        price: parseNumberOrNull(v.price),
        stock_quantity: parseNumberOrNull(v.stock),
        availability: 'in_stock',
      };
    });
    await supabase.from('product_variants').insert(variantRows as any);
  }

  // 9. Thèmes
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

  revalidatePath(`/livres/${product.slug}`);
  revalidatePath('/catalogue');
  revalidatePath('/');

  return NextResponse.json({ success: true, id: product.id, slug: product.slug });
}
