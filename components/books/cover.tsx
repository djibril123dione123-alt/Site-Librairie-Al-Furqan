import { BookStage } from './book-stage';
import type { Product } from '@/lib/types/ui';

/**
 * Backward-compatible facade over BookStage for every non-catalogue context
 * (hero, cart, search, PDP gallery fallback, collections, admin table) that
 * only ever needs a static, non-interactive book render. The catalogue/
 * related-products card renders BookStage directly with `interactive`
 * enabled — see BookCard.
 */
export function Cover({ product, small = false, priority = false }: { product: Product; small?: boolean; priority?: boolean }) {
  return <BookStage product={product} size={small ? 'sm' : 'md'} priority={priority} />;
}
