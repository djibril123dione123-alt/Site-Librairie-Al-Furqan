import { Product } from '@/lib/al-furqan-data';

export function StockBadge({ availability }: { availability: Product['availability'] }) {
  const isUnavailable = availability === 'Indisponible temporairement';
  const isLow = availability === 'Derniers exemplaires';
  const isRestocked = availability === 'De retour en stock';
  
  return (
    <span
      className={`stock-badge ${
        isUnavailable ? 'stock-unavailable' : isLow ? 'stock-low' : isRestocked ? 'stock-restocked' : 'stock-ok'
      }`}
    >
      <span className="stock-dot" />
      {availability}
    </span>
  );
}
