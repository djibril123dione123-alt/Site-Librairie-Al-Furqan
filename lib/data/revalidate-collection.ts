import { revalidatePath } from 'next/cache';

/**
 * Every public/admin surface a collection mutation can affect — mirrors
 * revalidate-product.ts's rationale: one shared list so create/edit/
 * publish/unpublish/delete/reorder/product-association all stay in sync
 * instead of each route revalidating a different partial subset.
 */
export function revalidateCollectionSurfaces(slug?: string) {
  revalidatePath('/collections');
  if (slug) revalidatePath(`/collections/${slug}`);
  revalidatePath('/');
  revalidatePath('/admin/collections');
}
