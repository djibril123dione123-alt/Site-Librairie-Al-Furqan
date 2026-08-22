import Link from 'next/link';
import type { Product } from '@/lib/types/ui';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Never invents a biography. No bio -> a small link, never a giant empty section. */
export function ProductAuthorBlock({ product }: { product: Product }) {
  const hasKnownAuthor = Boolean(product.author && product.author !== 'Auteur inconnu');
  if (!hasKnownAuthor) return null;

  const slug = product.authorSlug || slugify(product.author);

  if (!product.authorBio) {
    return (
      <div className="pdp-module pdp-author-mini">
        <Link href={`/auteurs/${slug}`} className="text-link">
          Découvrir {product.author} →
        </Link>
      </div>
    );
  }

  return (
    <div className="pdp-module pdp-author">
      <h2 className="pdp-module-heading">L&apos;auteur</h2>
      <strong className="pdp-author-name">{product.author}</strong>
      <p className="pdp-author-bio">{product.authorBio}</p>
      <Link href={`/auteurs/${slug}`} className="text-link">
        Voir tous ses ouvrages →
      </Link>
    </div>
  );
}
