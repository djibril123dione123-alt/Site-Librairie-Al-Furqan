export default function AdminProductEditLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la fiche produit">
      <div className="form-actions-sticky">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton-block" style={{ width: 100, height: 32, borderRadius: 6 }} />
          <div className="skeleton-line" style={{ width: 160 }} />
        </div>
        <div className="skeleton-block" style={{ width: 220, height: 36, borderRadius: 6 }} />
      </div>

      <div className="admin-form-container" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-block" style={{ width: '100%', height: 150, borderRadius: 12 }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton-block" style={{ width: '100%', height: 220, borderRadius: 12 }} />
          <div className="skeleton-block" style={{ width: '100%', height: 140, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}
