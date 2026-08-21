'use client';

import React from 'react';

interface WhatsAppLinkProps {
  href: string;
  productId: string;
  className?: string;
  children: React.ReactNode;
}

export function WhatsAppLink({ href, productId, className, children }: WhatsAppLinkProps) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        import('@/lib/data/analytics').then((m) => m.trackCatalogEvent('whatsapp_click', productId));
      }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
