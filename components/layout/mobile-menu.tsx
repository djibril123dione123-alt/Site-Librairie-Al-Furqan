'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, X, MessageCircle, Search, Heart, ShoppingBag, CircleUser } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';
import { useCustomerSession } from '../auth/customer-session-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { seedCategories } from '@/lib/dev/seed-products';

export function MobileMenu() {
  const { menuOpen, setMenuOpen, setSearchOpen, cartCount, wishlistCount } = useStore();
  const { isAuthenticated, authReady } = useCustomerSession();
  const pathname = usePathname();
  const accountHref =
    authReady && isAuthenticated ? '/compte' : `/connexion?next=${encodeURIComponent(pathname || '/')}`;
  const accountLabel = authReady && isAuthenticated ? 'Mon compte' : 'Se connecter';
  const [categories, setCategories] = useState<string[]>([]);

  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Same dialog semantics as CartDrawer: focus in on open, trap Tab,
  // Escape closes, focus restores to whatever opened it, background
  // scroll locked. This overlay had none of that until now.
  useEffect(() => {
    if (!menuOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      } else if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      previouslyFocused.current?.focus();
    };
  }, [menuOpen, setMenuOpen]);

  useEffect(() => {
    async function fetchCats() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        setCategories(seedCategories);
        return;
      }
      
      const supabase = createBrowserClient();
      const { data, error } = await supabase.from('categories').select('name').eq('is_visible', true).order('position');
      
      if (!error && data) {
        setCategories(data.map(c => c.name));
      } else {
        setCategories(seedCategories);
      }
    }
    fetchCats();
  }, []);

  if (!menuOpen) return null;

  return (
    <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
      <aside
        className="mobile-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-menu-header">
          <Link href="/" onClick={() => setMenuOpen(false)} className="brand">
            <span className="brand-symbol">
              <BookOpen size={18} />
            </span>
            <span>
              <strong>Al Furqan</strong>
            </span>
          </Link>
          <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" data-autofocus>
            <X size={22} />
          </button>
        </div>
        <nav className="mobile-menu-nav">
          <Link href="/catalogue" onClick={() => setMenuOpen(false)}>
            Catalogue
          </Link>
          <Link href="/collections" onClick={() => setMenuOpen(false)}>
            Collections
          </Link>
          <Link href="/catalogue?categorie=Coran" onClick={() => setMenuOpen(false)}>
            Corans
          </Link>
          <Link href="/a-propos" onClick={() => setMenuOpen(false)}>
            À propos
          </Link>
        </nav>
        <div className="mobile-menu-actions">
          <button
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen(true);
            }}
          >
            <Search size={18} /> Rechercher
          </button>
          <Link href="/selection" onClick={() => setMenuOpen(false)}>
            <Heart size={18} /> Ma sélection {wishlistCount > 0 && <i>{wishlistCount}</i>}
          </Link>
          <Link href="/panier" onClick={() => setMenuOpen(false)}>
            <ShoppingBag size={18} /> Panier {cartCount > 0 && <i>{cartCount}</i>}
          </Link>
          <Link href={accountHref} onClick={() => setMenuOpen(false)}>
            <CircleUser size={18} /> {accountLabel}
          </Link>
        </div>
        <div className="mobile-menu-categories">
          <strong>Catégories</strong>
          {categories.slice(0, 6).map((cat) => (
            <Link key={cat} href={`/catalogue?categorie=${encodeURIComponent(cat)}`} onClick={() => setMenuOpen(false)}>
              {cat}
            </Link>
          ))}
        </div>
        <a
          className="button button-dark mobile-menu-whatsapp"
          href={buildWhatsAppUrl('Assalāmu ʿalaykum, je souhaite vous contacter.')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} /> WhatsApp
        </a>
      </aside>
    </div>
  );
}
