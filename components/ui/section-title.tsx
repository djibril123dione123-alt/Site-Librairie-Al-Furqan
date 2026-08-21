import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SectionTitle({
  eyebrow,
  title,
  link,
  href = '/catalogue',
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  href?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && (
        <Link href={href} className="text-link">
          {link} <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
