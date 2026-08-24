export default function CatalogueLoading() {
  return (
    <main className="catalogue-page" aria-busy="true" aria-label="Chargement du catalogue">
      <div className="catalogue-heading">
        <div>
          <span className="skeleton-line" style={{ width: 90, display: 'inline-block' }} />
          <div className="skeleton-line" style={{ width: 260, height: 34, marginTop: 10 }} />
          <div className="skeleton-line" style={{ width: 160, marginTop: 10 }} />
        </div>
        <div className="catalogue-actions">
          <div className="skeleton-block" style={{ width: 90, height: 38, borderRadius: 99 }} />
          <div className="skeleton-block" style={{ width: 140, height: 38, borderRadius: 8 }} />
        </div>
      </div>

      <div className="book-grid" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 100px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="book-card">
            <div className="book-stage skeleton-block" style={{ minHeight: 260 }} />
            <div className="skeleton-line" style={{ width: '50%', marginTop: 14 }} />
            <div className="skeleton-line" style={{ width: '85%', marginTop: 8, height: '1.2em' }} />
            <div className="skeleton-line" style={{ width: '35%', marginTop: 8 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
