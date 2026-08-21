'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Heart, ShoppingBag, Menu, BookOpen } from 'lucide-react';
import { useStore } from '../providers';

export function Header() {
  const { cartCount, wishlistCount, setSearchOpen, setCartOpen, setMenuOpen } = useStore();

  return (
    <header className="site-header">
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
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/catalogue?nouveautes=1">Nouveautés</Link>
          <Link href="/collections">Sélections</Link>
          <Link href="/a-propos">À propos</Link>
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
          <button onClick={() => setCartOpen(true)} className="header-action cart-link" aria-label="Panier">
            <ShoppingBag size={18} />
            <span>Panier</span>
            {cartCount > 0 && <i>{cartCount}</i>}
          </button>
          <button className="mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
