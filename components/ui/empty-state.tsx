import type { ReactNode } from 'react';

/**
 * Canonical storefront empty state — one shared quiet shell (whitespace,
 * a small mark, a heading, one factual sentence) for every reconstructed
 * page's empty/no-result state. Recovery actions are passed as children so
 * each context keeps its own conversion path (reset filters + WhatsApp on
 * Catalogue, a single catalogue link on Collections/Selection, etc).
 * Admin and Cart keep their own `.empty-state` until Phase F.
 */
export function EmptyState({
  mark = '✦',
  title,
  body,
  children,
}: {
  mark?: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="storefront-empty">
      <span className="storefront-empty-mark" aria-hidden="true">
        {mark}
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="storefront-empty-actions">{children}</div>
    </div>
  );
}
