import { Truck } from 'lucide-react';

/** Only factual, always-true claims — no invented delivery time, price or coverage guarantee. */
export function ProductTrustStrip() {
  return (
    <div className="trust-strip">
      <Truck size={15} />
      <span>Expédition depuis Saint-Louis</span>
      <span className="trust-strip-sep" aria-hidden="true" />
      <span>Livraison au Sénégal</span>
    </div>
  );
}
