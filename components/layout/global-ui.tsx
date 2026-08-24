'use client';

import { Check } from 'lucide-react';
import { useStore } from '../providers';
import { SearchPanel } from '../catalogue/search-panel';
import { CartDrawer } from './cart-drawer';
import { MobileMenu } from './mobile-menu';
import { FloatingWhatsApp } from './floating-whatsapp';

export function GlobalUI() {
  const { toast } = useStore();

  return (
    <>
      <SearchPanel />
      <CartDrawer />
      <MobileMenu />
      <FloatingWhatsApp />
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={16} /> {toast}
        </div>
      )}
    </>
  );
}
