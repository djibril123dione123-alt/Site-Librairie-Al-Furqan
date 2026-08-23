import { Skeleton } from '../ui/skeleton';

/** Warm-surface loading placeholder shaped like a real cart line — no gray SaaS spinner, no layout jump once real data lands. */
export function CartLineSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`cart-line cart-line-skeleton ${compact ? 'cart-line-compact' : ''}`}>
      <Skeleton className="cart-line-cover-skeleton" />
      <div className="cart-line-copy">
        <Skeleton style={{ width: '70%', height: 15, marginBottom: 8 }} />
        <Skeleton style={{ width: '40%', height: 11, marginBottom: 10 }} />
        <Skeleton style={{ width: '92px', height: 30, borderRadius: 8 }} />
      </div>
      <Skeleton style={{ width: '56px', height: 15 }} />
    </div>
  );
}

export function CartLinesSkeleton({ count = 3, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CartLineSkeleton key={i} compact={compact} />
      ))}
    </>
  );
}
