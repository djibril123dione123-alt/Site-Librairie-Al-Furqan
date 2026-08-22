/**
 * Shared compact header for taxonomy-style entity pages (category, author,
 * publisher) — deliberately not used for collections, whose detail page
 * needs a larger, more immersive editorial hero (see brief §61).
 */
export function EntityHeader({
  eyebrow,
  title,
  meta,
  description,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  description?: string;
}) {
  return (
    <header className="entity-header">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {meta && <span className="entity-header-meta">{meta}</span>}
      {description && <p>{description}</p>}
    </header>
  );
}
