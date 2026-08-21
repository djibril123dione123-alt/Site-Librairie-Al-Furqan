import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Génération de slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const productSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  category: z.string().min(1, 'Catégorie requise'),
  price: z.number().nullable().optional(),
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
  variants: z.array(z.object({
    attributes: z.string(),
    price: z.number().nullable().optional(),
    stock: z.number().nullable().optional(),
  })).optional(),
});

// POST — créer un produit
export async function POST(request: NextRequest) {
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

  // Résoudre ou créer auteur/éditeur
  let authorId: string | null = null;
  let publisherId: string | null = null;
  let categoryId: string | null = null;

  if (data.author) {
    const authorSlug = generateSlug(data.author);
    const { data: existingAuthor } = await supabase.from('authors').select('id').eq('slug', authorSlug).single();
    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const { data: newAuthor } = await supabase.from('authors').insert({ name: data.author, slug: authorSlug } as any).select('id').single();
      authorId = newAuthor?.id || null;
    }
  }

  if (data.publisher) {
    const publisherSlug = generateSlug(data.publisher);
    const { data: existingPublisher } = await supabase.from('publishers').select('id').eq('slug', publisherSlug).single();
    if (existingPublisher) {
      publisherId = existingPublisher.id;
    } else {
      const { data: newPublisher } = await supabase.from('publishers').insert({ name: data.publisher, slug: publisherSlug } as any).select('id').single();
      publisherId = newPublisher?.id || null;
    }
  }

  if (data.category) {
    const categorySlug = generateSlug(data.category);
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
    categoryId = cat?.id || null;
  }

  // Générer slug unique
  const baseSlug = generateSlug(data.title);
  let slug = baseSlug;
  const { data: existing } = await supabase.from('products').select('id').eq('slug', slug).single();
  if (existing) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  const dbAvailability = data.availability ? uiAvailabilityToDb(data.availability as any) : 'in_stock';

  const { data: product, error } = await supabase.from('products').insert({
    slug,
    title: data.title,
    subtitle: data.subtitle || null,
    short_description: data.shortDescription || null,
    description: data.description || null,
    price: data.price || null,
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
  } as any).select('id').single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message || 'Erreur création produit' }, { status: 500 });
  }

  // Créer les variantes si présentes
  if (data.variants && data.variants.length > 0) {
    const variantRows = data.variants.map((v) => {
      const attrs: Record<string, string> = {};
      v.attributes.split(',').forEach((pair) => {
        const [key, val] = pair.split(':').map((s) => s.trim());
        if (key && val) attrs[key] = val;
      });
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

  revalidatePath('/catalogue');
  revalidatePath('/');

  return NextResponse.json({ success: true, id: product.id });
}

// PUT — mettre à jour un produit
export async function PUT(
  request: NextRequest,
  { params }: { params?: { id?: string } } = {}
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, message: 'Mode dev — non persisté' });
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const data = parsed.data;
  const supabase = createAdminClient();
  const dbAvailability = data.availability ? uiAvailabilityToDb(data.availability as any) : 'in_stock';

  const { error } = await supabase.from('products').update({
    title: data.title,
    subtitle: data.subtitle || null,
    short_description: data.shortDescription || null,
    description: data.description || null,
    price: data.price || null,
    availability: dbAvailability,
    stock_quantity: data.stockQuantity || null,
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
    has_variants: data.hasVariants || false,
    reading: data.reading || null,
    tajwid: data.tajwid || null,
    color: data.color || 'navy',
    published_at: data.status === 'published' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  } as any).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/livres/${id}`);
  revalidatePath('/catalogue');

  return NextResponse.json({ success: true });
}
