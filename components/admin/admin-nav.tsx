'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookMarked,
  Tag,
  Library,
  Users,
  Building2,
  MessageSquare,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Plus,
  Video,
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

const catalogueItems = [
  { href: '/admin/produits', label: 'Livres', icon: BookMarked },
  { href: '/admin/categories', label: 'Catégories', icon: Tag },
  { href: '/admin/collections', label: 'Collections', icon: Library },
  { href: '/admin/auteurs', label: 'Auteurs', icon: Users },
  { href: '/admin/editeurs', label: 'Éditeurs', icon: Building2 },
  { href: '/admin/videos-tiktok', label: 'Vidéos TikTok', icon: Video },
];

const trackingItems = [
  { href: '/admin/demandes', label: 'Demandes d\'ouvrages', icon: MessageSquare },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Fermer le drawer mobile lors de la navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Same dialog semantics as the public MobileMenu/CartDrawer: focus in on
  // open, trap Tab, Escape closes, focus restores to the hamburger button,
  // background scroll locked. The drawer previously had none of this.
  useEffect(() => {
    if (!mobileOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    sidebarRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      } else if (e.key === 'Tab' && sidebarRef.current) {
        const focusables = sidebarRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
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
  }, [mobileOpen]);

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Ignorer si mode dev / non configuré
    }
    window.location.href = '/admin/login';
  };

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Vue d\'ensemble';
    if (pathname.startsWith('/admin/produits/nouveau')) return 'Nouveau livre';
    if (pathname.startsWith('/admin/produits/')) return 'Édition livre';
    if (pathname.startsWith('/admin/produits')) return 'Catalogue livres';
    if (pathname.startsWith('/admin/categories')) return 'Gestion catégories';
    if (pathname.startsWith('/admin/collections')) return 'Gestion collections';
    if (pathname.startsWith('/admin/auteurs')) return 'Gestion auteurs';
    if (pathname.startsWith('/admin/editeurs')) return 'Gestion éditeurs';
    if (pathname.startsWith('/admin/videos-tiktok')) return 'Vidéos TikTok';
    if (pathname.startsWith('/admin/demandes')) return 'Demandes d\'ouvrages';
    return 'Administration';
  };

  // "+ Ajouter" always meant "Ajouter un livre" (it links to
  // /admin/produits/nouveau), which is misleading on every non-product
  // page — Categories/Authors/Publishers/Collections/Demandes already have
  // their own contextual creation controls and don't need a second,
  // wrongly-labelled one in the topbar.
  const showTopbarAddProduct = pathname.startsWith('/admin/produits') && pathname !== '/admin/produits/nouveau';

  return (
    <>
      {/* Topbar Mobile (visibles uniquement < 1024px) */}
      <header className="admin-topbar-mobile">
        <button
          ref={menuToggleRef}
          className="admin-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Fermer le menu d'administration" : "Ouvrir le menu d'administration"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="admin-topbar-title">{getPageTitle()}</span>
        {showTopbarAddProduct ? (
          <Link href="/admin/produits/nouveau" className="btn btn-gold btn-sm">
            <Plus size={14} /> Ajouter
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>

      {/* Overlay Backdrop Mobile — dims the page behind the drawer only;
          never above the drawer itself (see the layer scale note in
          admin.css — this was the P0 bug where every tap on a nav link
          actually hit this backdrop's close handler instead). */}
      <div
        className={`admin-nav-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Desktop / Mobile Drawer */}
      <aside
        className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}
        ref={sidebarRef}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? 'Navigation administration' : undefined}
      >
        <div className="admin-sidebar-header">
          <Link href="/admin" className="admin-sidebar-logo">
            <div className="admin-sidebar-logo-icon">AF</div>
            <div className="admin-sidebar-logo-text">
              <strong>Al Furqan</strong>
              <small>Back-Office</small>
            </div>
          </Link>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
            data-autofocus
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {/* Section Vue d'ensemble */}
          <div>
            <div className="admin-nav-group-label">Général</div>
            <Link
              href="/admin"
              className={`admin-nav-item ${pathname === '/admin' ? 'active' : ''}`}
            >
              <LayoutDashboard size={16} />
              <span>Vue d&apos;ensemble</span>
            </Link>
          </div>

          {/* Section Catalogue */}
          <div>
            <div className="admin-nav-group-label">Catalogue</div>
            {catalogueItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Section Suivi */}
          <div>
            <div className="admin-nav-group-label">Suivi</div>
            {trackingItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Pied de sidebar */}
        <div className="admin-sidebar-footer">
          <Link href="/" target="_blank" className="admin-nav-item" style={{ color: 'rgba(248, 250, 252, 0.8)' }}>
            <ExternalLink size={15} />
            <span>Voir la boutique</span>
          </Link>
          <button onClick={handleSignOut} className="admin-signout-btn">
            <LogOut size={15} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
