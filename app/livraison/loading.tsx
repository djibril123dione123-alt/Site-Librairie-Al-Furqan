export default function DeliveryLoading() {
  return (
    <main className="delivery-page" aria-busy="true" aria-label="Chargement de la livraison">
      <div className="delivery-heading">
        <div className="skeleton-line" style={{ width: 120 }} />
        <div className="skeleton-line" style={{ width: '60%', height: '1.8em', marginTop: 12 }} />
      </div>

      <div className="delivery-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="skeleton-block" style={{ width: '100%', height: 76, borderRadius: 12 }} />
        <div className="skeleton-block" style={{ width: '100%', height: 76, borderRadius: 12 }} />
        <div className="skeleton-block" style={{ width: '100%', height: 52, borderRadius: 8, marginTop: 10 }} />
        <div className="skeleton-block" style={{ width: '100%', height: 52, borderRadius: 8 }} />
        <div className="skeleton-block" style={{ width: '100%', height: 52, borderRadius: 8 }} />
      </div>
    </main>
  );
}
