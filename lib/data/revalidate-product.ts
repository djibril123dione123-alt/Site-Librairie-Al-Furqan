import { revalidatePath } from 'next/cache';

/**
 * Every public/admin surface a product mutation can affect, in one place —
 * so create/update/archive/quick-stock all stay consistent instead of each
 * route drifting its own partial list (the bug this replaces: create/update
 * revalidated the public site but not /admin/produits, so a freshly
 * published book didn't appear in the admin list without a manual reload).
 *
 * Entity detail pages (author/publisher/category) are revalidated by their
 * dynamic route pattern rather than a specific slug: at mutation time we
 * only reliably have the entity's id, not its slug, for both the old and
 * new value on an edit — resolving those slugs would mean extra queries
 * just to invalidate. `revalidatePath('/x/[slug]', 'page')` revalidates
 * every existing page matching that pattern in one call, which correctly
 * covers both the old and new entity page whenever a product moves
 * between categories/authors/publishers, without querying anything.
 */
export function revalidateProductSurfaces(slug: string) {
  revalidatePath(`/livres/${slug}`);
  revalidatePath('/catalogue');
  revalidatePath('/');
  revalidatePath('/admin/produits');
  revalidatePath('/categories/[slug]', 'page');
  revalidatePath('/auteurs/[slug]', 'page');
  revalidatePath('/editeurs/[slug]', 'page');
}
