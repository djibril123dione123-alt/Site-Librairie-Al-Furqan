import type { CartLine } from '@/components/providers';
import type { Product, Variant } from '@/lib/types/ui';

/**
 * One line's outcome after checking stale localStorage data against the
 * live product/variant tables. VALID is the only status counted toward the
 * confirmed subtotal or allowed to continue to delivery.
 */
export type CartLineStatus =
  | 'VALID'
  | 'PRODUCT_REMOVED'
  | 'PRODUCT_UNAVAILABLE'
  | 'VARIANT_REMOVED'
  | 'OUT_OF_STOCK'
  | 'QUANTITY_EXCEEDS_STOCK';

export interface ResolvedCartLine {
  cartIndex: number;
  line: CartLine;
  product: Product | null;
  matchedVariant: Variant | null;
  unitPrice: number | null;
  lineTotal: number | null;
  maxStock: number | null;
  status: CartLineStatus;
  warning: string | null;
}

export interface CartResolution {
  lines: ResolvedCartLine[];
  /** A network/query failure — distinct from a line legitimately missing
   *  its product. The UI must never conflate the two. */
  loadError: boolean;
}
