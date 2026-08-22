import Link from 'next/link';

/**
 * One shared quiet empty-state language, replacing the bordered white
 * "SaaS card" pattern repeated across every legacy entity page — large
 * whitespace, a small mark, a heading, one factual sentence, a text/button
 * CTA. No claims about future inventory.
 */
export function EditorialEmptyState({
  mark = '✦',
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  mark?: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="editorial-empty">
      <span className="editorial-empty-mark" aria-hidden="true">{mark}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <Link href={ctaHref} className="button button-dark">
        {ctaLabel}
      </Link>
    </div>
  );
}
