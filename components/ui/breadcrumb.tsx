import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Canonical storefront breadcrumb — one visual/semantic family for every
 * reconstructed page (PDP, Catalogue, Selection, Collections, Categories,
 * Auteurs, Éditeurs, About). Cart/Delivery/Contact keep their own legacy
 * `.breadcrumb` markup until Phase F.
 */
export function Breadcrumb({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className={`storefront-breadcrumb${className ? ` ${className}` : ''}`}>
      {items.map((item, i) => (
        <span key={i} className="storefront-breadcrumb-item">
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="storefront-breadcrumb-current">{item.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight size={12} aria-hidden="true" />}
        </span>
      ))}
    </nav>
  );
}
