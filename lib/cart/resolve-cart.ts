import type { CartLine } from '@/components/providers';
import type { Product } from '@/lib/types/ui';
import { createBrowserClient } from '@/lib/supabase/client';
import { dbProductToUi } from '@/lib/types/mappers';
import { seedProducts } from '@/lib/dev/seed-products';
import type { CartLineStatus, CartResolution, ResolvedCartLine } from './types';

const WARNINGS: Record<Exclude<CartLineStatus, 'VALID' | 'QUANTITY_EXCEEDS_STOCK'>, string> = {
  PRODUCT_REMOVED: "Cet ouvrage n'est plus disponible dans le catalogue.",
  PRODUCT_UNAVAILABLE: 'Cet ouvrage est temporairement indisponible.',
  VARIANT_REMOVED: "Cette option n'est plus disponible.",
  OUT_OF_STOCK: 'Indisponible actuellement.',
};

function resolveLine(cartIndex: number, line: CartLine, product: Product | undefined): ResolvedCartLine {
  if (!product) {
    return {
      cartIndex,
      line,
      product: null,
      matchedVariant: null,
      unitPrice: null,
      lineTotal: null,
      maxStock: null,
      status: 'PRODUCT_REMOVED',
      warning: WARNINGS.PRODUCT_REMOVED,
    };
  }

  const isPublishedAvailable = product.availability !== 'Indisponible temporairement';

  if (line.variant) {
    const matchedVariant = product.variants?.find((v) => v.id === line.variant!.id) ?? null;
    if (!matchedVariant) {
      return {
        cartIndex,
        line,
        product,
        matchedVariant: null,
        unitPrice: null,
        lineTotal: null,
        maxStock: null,
        status: 'VARIANT_REMOVED',
        warning: WARNINGS.VARIANT_REMOVED,
      };
    }

    const unitPrice = matchedVariant.price ?? product.price;
    const maxStock = matchedVariant.stock ?? null;
    return finish(cartIndex, line, product, matchedVariant, unitPrice, maxStock, isPublishedAvailable);
  }

  const unitPrice = product.price;
  const maxStock = product.stockQuantity ?? null;
  return finish(cartIndex, line, product, null, unitPrice, maxStock, isPublishedAvailable);
}

function finish(
  cartIndex: number,
  line: CartLine,
  product: Product,
  matchedVariant: ResolvedCartLine['matchedVariant'],
  unitPrice: number,
  maxStock: number | null,
  isPublishedAvailable: boolean
): ResolvedCartLine {
  let status: CartLineStatus = 'VALID';
  let warning: string | null = null;

  if (!isPublishedAvailable) {
    status = 'PRODUCT_UNAVAILABLE';
    warning = WARNINGS.PRODUCT_UNAVAILABLE;
  } else if (maxStock !== null && maxStock === 0) {
    status = 'OUT_OF_STOCK';
    warning = WARNINGS.OUT_OF_STOCK;
  } else if (maxStock !== null && maxStock > 0 && line.quantity > maxStock) {
    status = 'QUANTITY_EXCEEDS_STOCK';
    warning = `Stock disponible : ${maxStock}. Réduisez la quantité pour continuer.`;
  }

  const lineTotal = status === 'VALID' ? unitPrice * line.quantity : null;

  return { cartIndex, line, product, matchedVariant, unitPrice, lineTotal, maxStock, status, warning };
}

/**
 * The one cart-product resolution layer shared by /panier and CartDrawer.
 * Live product/variant data always wins over stale localStorage — never
 * the other way around. When Supabase is configured, a product missing
 * from the live query result is PRODUCT_REMOVED, never resurrected from
 * seed data; seed fallback only applies in local dev with no Supabase URL.
 */
export async function resolveCart(cart: CartLine[]): Promise<CartResolution> {
  if (cart.length === 0) return { lines: [], loadError: false };

  const ids = Array.from(new Set(cart.map((c) => c.productId)));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    const map: Record<string, Product> = {};
    ids.forEach((id) => {
      const p = seedProducts.find((s) => s.id === id);
      if (p) map[id] = p as unknown as Product;
    });
    const lines = cart.map((line, i) => resolveLine(i, line, map[line.productId]));
    return { lines, loadError: false };
  }

  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from('products')
      .select(`*, authors(id, name, slug), publishers(id, name, slug), categories(id, name, slug), product_variants(*), product_images(*)`)
      .in('id', ids)
      .eq('status', 'published');

    if (error) {
      return {
        lines: cart.map((line, i) => ({
          cartIndex: i,
          line,
          product: null,
          matchedVariant: null,
          unitPrice: null,
          lineTotal: null,
          maxStock: null,
          status: 'PRODUCT_REMOVED',
          warning: null,
        })),
        loadError: true,
      };
    }

    const map: Record<string, Product> = {};
    (data || []).forEach((d: any) => {
      map[d.id] = dbProductToUi(d, supabaseUrl);
    });

    const lines = cart.map((line, i) => resolveLine(i, line, map[line.productId]));
    return { lines, loadError: false };
  } catch {
    return {
      lines: cart.map((line, i) => ({
        cartIndex: i,
        line,
        product: null,
        matchedVariant: null,
        unitPrice: null,
        lineTotal: null,
        maxStock: null,
        status: 'PRODUCT_REMOVED',
        warning: null,
      })),
      loadError: true,
    };
  }
}
