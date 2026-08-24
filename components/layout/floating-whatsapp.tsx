'use client';

import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';

/**
 * A general customer-support shortcut, distinct from the structured order
 * CTA on the WhatsApp handoff at the end of the delivery funnel. Hidden on
 * PDP (already has a product-specific contact CTA) and on Cart/Delivery
 * (the transaction must not be bypassed mid-flow). Admin is excluded by
 * StorefrontLayout, which never renders GlobalUI on /admin routes.
 */
const HIDDEN_PREFIXES = ['/livres/', '/panier', '/livraison'];

const SUPPORT_MESSAGE = "Assalāmu ʿalaykum, j'aimerais avoir un renseignement sur les livres disponibles.";

export function FloatingWhatsApp() {
  const pathname = usePathname() || '/';
  const { searchOpen, cartOpen, menuOpen } = useStore();

  const isHiddenRoute = HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
  const isOverlayOpen = searchOpen || cartOpen || menuOpen;

  if (isHiddenRoute || isOverlayOpen) return null;

  return (
    <a
      href={buildWhatsAppUrl(SUPPORT_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-whatsapp"
      aria-label="Contacter Al Furqan sur WhatsApp"
    >
      <MessageCircle size={24} aria-hidden="true" />
    </a>
  );
}
