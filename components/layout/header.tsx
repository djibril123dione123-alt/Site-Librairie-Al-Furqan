'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search, Heart, ShoppingBag, Menu, BookOpen, CircleUser } from 'lucide-react';
import { useStore } from '../providers';
import { useCustomerSession } from '../auth/customer-session-provider';

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categorie = (searchParams.get('categorie') || '').toLowerCase();

  const isCoran = pathname === '/catalogue' && categorie === 'coran';
  const isCatalogue = pathname === '/catalogue' && !isCoran;
  const isCollections = pathname.startsWith('/collections');
  const isAbout = pathname === '/a-propos';

  return (
    <>
      <Link href="/catalogue" className={isCatalogue ? 'is-active' : ''} aria-current={isCatalogue ? 'page' : undefined}>
        Catalogue
      </Link>
      <Link href="/collections" className={isCollections ? 'is-active' : ''} aria-current={isCollections ? 'page' : undefined}>
        Collections
      </Link>
      <Link href="/catalogue?categorie=Coran" className={isCoran ? 'is-active' : ''} aria-current={isCoran ? 'page' : undefined}>
        Corans
      </Link>
      <Link href="/a-propos" className={isAbout ? 'is-active' : ''} aria-current={isAbout ? 'page' : undefined}>
        À propos
      </Link>
    </>
  );
}

function NavLinksFallback() {
  return (
    <>
      <Link href="/catalogue">Catalogue</Link>
      <Link href="/collections">Collections</Link>
      <Link href="/catalogue?categorie=Coran">Corans</Link>
      <Link href="/a-propos">À propos</Link>
    </>
  );
}

export function Header() {
  const { cartCount, wishlistCount, setSearchOpen, setCartOpen, setMenuOpen } = useStore();
  // Defaults to the guest destination until the session is known, so the
  // action never visibly flips from "Mon compte" back to "Se connecter" —
  // only the reverse (rare, and harmless) could ever happen.
  const { isAuthenticated, authReady } = useCustomerSession();
  const pathname = usePathname();
  const accountHref =
    authReady && isAuthenticated ? '/compte' : `/connexion?next=${encodeURIComponent(pathname || '/')}`;
  const accountLabel = authReady && isAuthenticated ? 'Mon compte' : 'Se connecter';
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Al Furqan, accueil">
          <div className="brand-symbol" style={{ position: 'relative', overflow: 'hidden' }}>
            <Image
              src="/assets/images/image.png"
              alt="Logo Al Furqan"
              width={34}
              height={34}
              style={{ objectFit: 'contain' }}
              onError={(e) => {
                // Fallback icon if image fails
                e.currentTarget.style.display = 'none';
              }}
            />
            <BookOpen size={18} className="brand-fallback-icon" style={{ display: 'none' }} />
          </div>
          <span>
            <strong>Al Furqan</strong>
            <small>Librairie islamique</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="header-actions">
          <button onClick={() => setSearchOpen(true)} className="header-action" aria-label="Rechercher">
            <Search size={18} />
            <span>Rechercher</span>
          </button>
          <Link href="/selection" className="header-action selection-link" aria-label="Ma sélection">
            <Heart size={18} />
            <span>Ma sélection</span>
            {wishlistCount > 0 && <i>{wishlistCount}</i>}
          </Link>
          <Link href={accountHref} className="header-action account-link" aria-label={accountLabel}>
            <CircleUser size={18} />
            <span>{accountLabel}</span>
          </Link>
          <button onClick={() => setCartOpen(true)} className="header-action cart-link cart-link-desktop" aria-label="Panier">
            <ShoppingBag size={18} />
            <span>Panier</span>
            {cartCount > 0 && <i>{cartCount}</i>}
          </button>
          <Link href="/panier" className="header-action cart-link cart-link-mobile" aria-label="Panier">
            <ShoppingBag size={18} />
            <span>Panier</span>
            {cartCount > 0 && <i>{cartCount}</i>}
          </Link>
          <button className="mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
