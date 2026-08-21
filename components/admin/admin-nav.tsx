'use client';

import { useState, useEffect } from 'react';
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
  Plus
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

const catalogueItems = [
  { href: '/admin/produits', label: 'Livres', icon: BookMarked },
  { href: '/admin/categories', label: 'Catégories', icon: Tag },
  { href: '/admin/collections', label: 'Collections', icon: Library },
  { href: '/admin/auteurs', label: 'Auteurs', icon: Users },
  { href: '/admin/editeurs', label: 'Éditeurs', icon: Building2 },
];

const trackingItems = [
  { href: '/admin/demandes', label: 'Demandes d\'ouvrages', icon: MessageSquare },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermer le drawer mobile lors de la navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Ignorer si mode dev / non configuré
    }
    router.push('/admin/login');
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
    if (pathname.startsWith('/admin/demandes')) return 'Demandes d\'ouvrages';
    return 'Administration';
  };

  return (
    <>
      {/* Topbar Mobile (visibles uniquement < 1024px) */}
      <header className="admin-topbar-mobile">
        <button 
          className="admin-menu-toggle" 
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Ouvrir le menu d'administration"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="admin-topbar-title">{getPageTitle()}</span>
        <Link href="/admin/produits/nouveau" className="btn btn-gold btn-sm">
          <Plus size={14} /> Ajouter
        </Link>
      </header>

      {/* Overlay Backdrop Mobile */}
      <div 
        className={`admin-drawer-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Desktop / Mobile Drawer */}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link href="/admin" className="admin-sidebar-logo">
            <div className="admin-sidebar-logo-icon">AF</div>
            <div className="admin-sidebar-logo-text">
              <strong>Al Furqan</strong>
              <small>Back-Office</small>
            </div>
          </Link>
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
