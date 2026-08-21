'use client';

import Link from 'next/link';
import { BookOpen, Search, Heart, ShoppingBag, Menu } from 'lucide-react';
import { useStore } from '../providers';

export function Header() {
  const { cartCount, wishlistCount, setSearchOpen, setCartOpen, setMenuOpen } = useStore();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Al Furqan, accueil">
          <span className="brand-symbol">
            <BookOpen size={18} />
          </span>
          <span>
            <strong>Al Furqan</strong>
            <small>Librairie islamique</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/catalogue?nouveautes=1">Nouveautés</Link>
          <Link href="/collections/mieux-comprendre-le-coran">Sélections</Link>
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
