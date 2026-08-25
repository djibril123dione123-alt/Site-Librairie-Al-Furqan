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
  revalidatePath('/categories');
  revalidatePath('/categories/[slug]', 'page');
  // /auteurs and /editeurs are index pages, not just entity detail pages —
  // /auteurs sorts by live published book count, and /editeurs renders up
  // to 3 real product cover images per publisher directly on the index
  // (Phase L cover-crop audit: a crop, a status flip, or a publisher/author
  // change on any product can make either page stale without this).
  revalidatePath('/auteurs');
  revalidatePath('/auteurs/[slug]', 'page');
  revalidatePath('/editeurs');
  revalidatePath('/editeurs/[slug]', 'page');
  // A product can be featured in a collection — its price/cover/status
  // changing must not leave that collection's page showing stale data.
  revalidatePath('/collections');
  revalidatePath('/collections/[slug]', 'page');
}
