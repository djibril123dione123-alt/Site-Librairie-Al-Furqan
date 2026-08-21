import React from 'react';

export function Skeleton({
  className = '',
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        backgroundColor: '#E2E8F0',
        borderRadius: 6,
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="book-card-skeleton" style={{ padding: 12, borderRadius: 8, background: '#FFF', border: '1px solid #E2E8F0' }}>
      <Skeleton style={{ width: '100%', height: 210, borderRadius: 6, marginBottom: 12 }} />
      <Skeleton style={{ width: '40%', height: 12, marginBottom: 8 }} />
      <Skeleton style={{ width: '85%', height: 16, marginBottom: 6 }} />
      <Skeleton style={{ width: '60%', height: 14, marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Skeleton style={{ width: '35%', height: 18 }} />
        <Skeleton style={{ width: '40%', height: 28, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}
