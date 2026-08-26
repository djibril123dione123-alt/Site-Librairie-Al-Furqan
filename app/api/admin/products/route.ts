import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';
import { uiAvailabilityToDb } from '@/lib/types/mappers';
import { z } from 'zod';
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

// A brand-new product with no other references yet is safe to fully
// unwind: deleting the row cascades to product_images/product_variants/
// product_themes (all ON DELETE CASCADE — see migration 001), so any child
// rows this creation attempt already wrote disappear with it. Only the
// Storage files need explicit cleanup, since Storage has no cascade of its
// own (Phase L §1-3: never leave a half-created product behind).
async function rollbackFailedProductCreation(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  candidatePaths: (string | null | undefined)[]
) {
  await supabase.from('products').delete().eq('id', productId);

  const uniquePaths = Array.from(new Set(candidatePaths.filter((p): p is string => Boolean(p))));
  for (const path of uniquePaths) {
    const { count } = await supabase
      .from('product_images')
      .select('*', { count: 'exact', head: true })
      .or(`storage_path.eq.${path},original_storage_path.eq.${path}`);
    if ((count ?? 0) === 0) {
      await supabase.storage.from('product-images').remove([path]);
    }
  }
}

const imageSchema = z.object({
  id: z.string().optional(),
  storagePath: z.string(),
  originalStoragePath: z.string().nullable().optional(),
  cropData: z.any().nullable().optional(),
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

// GET — liste légère pour les sélecteurs Admin (ex: association de livres
// à une collection). Le catalogue tient en une poignée de dizaines de
// lignes : un filtrage client sur cette liste complète suffit, comme le
// fait déjà la table produits elle-même (voir ProductListTable).
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError === 'UNAUTHORIZED') return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (authError === 'FORBIDDEN') return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const supabase = createAdminClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, title, isbn, price, status, authors(name), publishers(name), product_images(storage_path, type)')
    .order('title');

  if (error) return NextResponse.json([], { status: 500 });

  const mapped = (data || []).map((p: any) => {
    const cover = p.product_images?.find((img: any) => img.type === 'cover') || p.product_images?.[0];
    const coverUrl = cover?.storage_path
      ? (cover.storage_path.startsWith('http') ? cover.storage_path : `${supabaseUrl}/storage/v1/object/public/product-images/${cover.storage_path}`)
      : null;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      isbn: p.isbn || null,
      price: p.price,
      status: p.status,
      author: p.authors?.name || null,
      publisher: p.publishers?.name || null,
      coverUrl,
    };
  });

  return NextResponse.json(mapped);
}

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

  // "Variantes activées" ne veut rien dire sans au moins une variante —
  // sinon has_variants=true peut survivre avec zéro ligne product_variants.
  if (data.hasVariants === true && !(Array.isArray(data.variants) && data.variants.length >= 1)) {
    return NextResponse.json({ error: 'Ajoutez au moins une variante ou désactivez l\'option variantes.' }, { status: 400 });
  }

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
    const hasCover = (data.images || []).some((img) => img.type === 'cover' && img.storagePath);
    if (!hasCover) {
      return NextResponse.json({ error: 'Ajoutez une couverture avant de publier ce livre.' }, { status: 400 });
    }
    if (/\(copie\)/i.test(data.title)) {
      return NextResponse.json({ error: 'Renommez cette copie avant de la publier.' }, { status: 400 });
    }
  }

  // 1. Résolution Auteur
  let authorId: string | null = data.authorId || null;
  if (!authorId && data.author) {
    authorId = await resolveOrCreateEntityId(supabase, 'authors', data.author);
  }

  // 2. Résolution Éditeur
  let publisherId: string | null = data.publisherId || null;
  if (!publisherId && data.publisher) {
    publisherId = await resolveOrCreateEntityId(supabase, 'publishers', data.publisher);
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

  // 7. Images — critique : un échec ici ne doit jamais laisser un produit
  // fraîchement créé sans le recadrage/couverture demandé (Phase L §1-3).
  let coverAssigned = false;
  const imageRows: Array<{
    product_id: string;
    storage_path: string;
    original_storage_path: string | null;
    crop_data: any;
    type: string;
    position: number;
    alt_text: string | null;
  }> = [];

  if (data.images && data.images.length > 0) {
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
        original_storage_path: img.originalStoragePath || null,
        crop_data: img.cropData || null,
        type,
        position: img.position ?? idx,
        alt_text: img.altText || null,
      });
    }
  }

  // Every Storage path this creation attempt touched — used to clean up
  // orphaned files if a rollback becomes necessary below, regardless of
  // which child step actually fails.
  const candidateStoragePaths = imageRows.flatMap((r) => [r.storage_path, r.original_storage_path]);

  if (imageRows.length > 0) {
    const { error: imagesErr } = await supabase.from('product_images').insert(imageRows as any);
    if (imagesErr) {
      await rollbackFailedProductCreation(supabase, product.id, candidateStoragePaths);
      return NextResponse.json({ error: `La création a échoué lors de l'enregistrement des images : ${imagesErr.message}` }, { status: 500 });
    }
  }

  // 8. Variantes (en préservant 0 pour le stock et prix) — critique quand
  // hasVariants=true : un produit annoncé "avec variantes" ne doit jamais
  // survivre sans elles (Phase L §1-3).
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
    const { error: variantsErr } = await supabase.from('product_variants').insert(variantRows as any);
    if (variantsErr) {
      await rollbackFailedProductCreation(supabase, product.id, candidateStoragePaths);
      return NextResponse.json({ error: `La création a échoué lors de l'enregistrement des variantes : ${variantsErr.message}` }, { status: 500 });
    }
  }

  // 9. Thèmes — non critique (aucune référence externe n'en dépend) : un
  // échec ici ne justifie pas de défaire un produit et ses images/variantes
  // déjà valides, mais ne doit pas non plus être avalé en silence.
  let themeWarning: string | undefined;
  if (data.themes && data.themes.length > 0) {
    for (const themeName of data.themes) {
      if (!themeName.trim()) continue;
      const themeSlug = generateSlug(themeName);
      let themeId: string | null = null;
      const { data: existingTheme } = await supabase.from('themes').select('id').eq('slug', themeSlug).single();
      if (existingTheme) {
        themeId = existingTheme.id;
      } else {
        const { data: newTheme, error: themeInsertErr } = await supabase.from('themes').insert({ name: themeName.trim(), slug: themeSlug } as any).select('id').single();
        if (themeInsertErr || !newTheme) {
          themeWarning = `Certains thèmes n'ont pas pu être enregistrés : ${themeInsertErr?.message || 'erreur inconnue'}`;
          continue;
        }
        themeId = newTheme.id;
      }
      if (themeId) {
        const { error: linkErr } = await supabase.from('product_themes').insert({ product_id: product.id, theme_id: themeId } as any);
        if (linkErr) {
          themeWarning = `Certains thèmes n'ont pas pu être associés : ${linkErr.message}`;
        }
      }
    }
  }

  revalidateProductSurfaces(product.slug);

  return NextResponse.json({
    success: true,
    id: product.id,
    slug: product.slug,
    ...(themeWarning ? { warning: themeWarning } : {}),
  });
}
