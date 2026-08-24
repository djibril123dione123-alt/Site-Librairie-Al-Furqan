'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCustomerSession } from '../auth/customer-session-provider';

/**
 * A quiet, inline "this would be easier with an account" hint — never a
 * modal, never sitewide, only shown where the guest already has something
 * concrete worth saving (cart, favorites, delivery destination). Dismissal
 * is local to this render only; it isn't meant to be a persistent
 * preference, just a way to not be pushy.
 */
export function AccountNudge({
  title,
  body,
  ctaLabel,
  secondaryLabel,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  secondaryLabel?: string;
}) {
  const pathname = usePathname();
  const { authReady, isAuthenticated } = useCustomerSession();
  const [dismissed, setDismissed] = useState(false);

  if (!authReady || isAuthenticated || dismissed) return null;

  const next = `/connexion?next=${encodeURIComponent(pathname || '/')}`;

  return (
    <div className="delivery-inline-note account-nudge">
      <strong>{title}</strong>
      <p className="delivery-hint">{body}</p>
      <div className="account-nudge-actions">
        <Link href={next} className="button button-light">
          {ctaLabel}
        </Link>
        {secondaryLabel && (
          <button type="button" className="text-link" onClick={() => setDismissed(true)}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
