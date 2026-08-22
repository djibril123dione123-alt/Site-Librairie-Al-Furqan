import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function EditorialBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="editorial-breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="editorial-breadcrumb-item">
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span className="editorial-breadcrumb-current">{item.label}</span>}
          {i < items.length - 1 && <ChevronRight size={12} aria-hidden="true" />}
        </span>
      ))}
    </nav>
  );
}
