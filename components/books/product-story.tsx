/** Real description only — never invented editorial praise. */
export function ProductStory({ description, shortDescription }: { description?: string; shortDescription?: string }) {
  const text = description?.trim();
  if (!text && !shortDescription) return null;

  const paragraphs = text
    ? text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <div className="pdp-module pdp-story">
      <h2 className="pdp-module-heading">À propos de ce livre</h2>
      {shortDescription && <p className="pdp-story-lede">{shortDescription}</p>}
      {(paragraphs.length > 0 ? paragraphs : text ? [text] : []).map((p, i) => (
        <p className="pdp-story-p" key={i}>{p}</p>
      ))}
    </div>
  );
}
