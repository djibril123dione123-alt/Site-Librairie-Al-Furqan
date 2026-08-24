export default function AdminProduitsLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement du catalogue">
      <div className="admin-page-header">
        <div>
          <div className="skeleton-line" style={{ width: 220, height: '1.6em' }} />
          <div className="skeleton-line" style={{ width: 320, marginTop: 8 }} />
        </div>
        <div className="skeleton-block" style={{ width: 150, height: 36, borderRadius: 8 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--admin-border)', paddingBottom: 12 }}>
        {[70, 90, 100].map((w, i) => (
          <div key={i} className="skeleton-block" style={{ width: w, height: 30, borderRadius: 6 }} />
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="skeleton-block" style={{ flex: 1, minWidth: 260, height: 38, borderRadius: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton-block" style={{ width: 140, height: 38, borderRadius: 8 }} />
          <div className="skeleton-block" style={{ width: 140, height: 38, borderRadius: 8 }} />
        </div>
      </div>

      <div className="admin-table-wrap" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ width: '100%', height: 48, borderRadius: 6 }} />
        ))}
      </div>
    </div>
  );
}
