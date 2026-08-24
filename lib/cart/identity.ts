import type { CartLine } from '@/components/providers';

/**
 * A cart line's variant id, whichever shape produced it: the explicit
 * `variantId` written by cloud-restored lines (Phase J — the cloud store
 * never keeps a full Variant snapshot), or the legacy `variant.id` still
 * present in existing `af-cart` localStorage payloads. Old browsers must
 * keep working without migration.
 */
export function getVariantId(line: Pick<CartLine, 'variantId' | 'variant'>): string | undefined {
  return line.variantId ?? line.variant?.id;
}

/**
 * Stable identity for a cart line: product + variant, never title/SKU/index.
 * Used both as the React list key and as the cloud table's line_key, so a
 * base product and each of its variants always remain distinct lines.
 */
export function getLineKey(line: Pick<CartLine, 'productId' | 'variantId' | 'variant'>): string {
  const variantId = getVariantId(line);
  return `${line.productId}:${variantId ?? 'base'}`;
}
