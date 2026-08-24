export default function ProductLoading() {
  return (
    <main aria-busy="true" aria-label="Chargement de la fiche livre">
      <div className="pdp-overture">
        <div className="pdp-gallery-col">
          <div className="gallery-stage gallery-main skeleton-block" style={{ minHeight: 480 }} />
        </div>

        <div className="pdp-info-col">
          <div className="skeleton-line" style={{ width: 100 }} />
          <div className="skeleton-line" style={{ width: '80%', height: '2em', marginTop: 14 }} />
          <div className="skeleton-line" style={{ width: '45%', marginTop: 12 }} />
          <div className="skeleton-line" style={{ width: 140, height: 30, marginTop: 24 }} />
          <div className="skeleton-block" style={{ width: '100%', height: 50, borderRadius: 8, marginTop: 20 }} />
          <div className="skeleton-block" style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 16 }} />
        </div>
      </div>
    </main>
  );
}
