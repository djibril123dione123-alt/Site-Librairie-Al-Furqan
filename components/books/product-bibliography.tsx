import Link from 'next/link';
import type { Product } from '@/lib/types/ui';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Quiet editorial key/value rhythm — replaces the previous table-like block.
 * Author/publisher are only rendered as links when they're real, verified
 * entities (never for the "Auteur inconnu" placeholder).
 */
export function ProductBibliography({ product }: { product: Product }) {
  const hasKnownAuthor = Boolean(product.author && product.author !== 'Auteur inconnu');
  const authorSlug = product.authorSlug || slugify(product.author);
  const hasPublisher = Boolean(product.publisher);
  const publisherSlug = product.publisherSlug || (hasPublisher ? slugify(product.publisher) : '');

  const rows: { label: string; value?: string; href?: string }[] = [
    { label: 'Auteur', value: hasKnownAuthor ? product.author : undefined, href: hasKnownAuthor ? `/auteurs/${authorSlug}` : undefined },
    { label: 'Éditeur', value: hasPublisher ? product.publisher : undefined, href: hasPublisher ? `/editeurs/${publisherSlug}` : undefined },
    { label: 'Langue', value: product.language },
    { label: 'Lecture', value: product.reading },
    // Boolean true only tells us Tajwid markings are present — never invent a
    // specific colour-coding system the data doesn't actually describe.
    { label: 'Tajwid', value: product.tajwid ? 'Avec règles de Tajwid' : undefined },
    { label: 'Format', value: product.format },
    { label: 'Reliure', value: product.binding },
    { label: 'Édition', value: product.edition },
    { label: 'Année', value: product.year?.toString() },
    { label: 'Pages', value: product.pages?.toString() },
    { label: 'Dimensions', value: product.dimensions },
    { label: 'ISBN', value: product.isbn },
    { label: 'Thèmes', value: product.themes.length > 0 ? product.themes.join(' · ') : undefined },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <div className="pdp-module pdp-bibliography">
      <h2 className="pdp-module-heading">Bibliographie</h2>
      <dl className="biblio-list">
        {rows.map((row) => (
          <div className="biblio-row" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.href ? <Link href={row.href} className="text-link">{row.value}</Link> : row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
