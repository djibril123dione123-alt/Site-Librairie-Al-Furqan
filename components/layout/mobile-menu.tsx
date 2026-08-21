'use client';

import Link from 'next/link';
import { BookOpen, X, MessageCircle } from 'lucide-react';
import { categories, buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';

export function MobileMenu() {
  const { menuOpen, setMenuOpen } = useStore();

  if (!menuOpen) return null;

  return (
    <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
      <aside className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-menu-header">
          <Link href="/" onClick={() => setMenuOpen(false)} className="brand">
            <span className="brand-symbol">
              <BookOpen size={18} />
            </span>
            <span>
              <strong>Al Furqan</strong>
            </span>
          </Link>
          <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
            <X size={22} />
          </button>
        </div>
        <nav className="mobile-menu-nav">
          <Link href="/catalogue" onClick={() => setMenuOpen(false)}>
            Catalogue
          </Link>
          <Link href="/catalogue?nouveautes=1" onClick={() => setMenuOpen(false)}>
            Nouveautés
          </Link>
          <Link href="/collections/mieux-comprendre-le-coran" onClick={() => setMenuOpen(false)}>
            Sélections
          </Link>
          <Link href="/selection" onClick={() => setMenuOpen(false)}>
            Ma sélection
          </Link>
          <Link href="/livraison" onClick={() => setMenuOpen(false)}>
            Livraison
          </Link>
          <Link href="/a-propos" onClick={() => setMenuOpen(false)}>
            À propos
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </nav>
        <div className="mobile-menu-categories">
          <strong>Catégories</strong>
          {categories.slice(0, 6).map((cat) => (
            <Link key={cat} href={`/catalogue?categorie=${encodeURIComponent(cat)}`} onClick={() => setMenuOpen(false)}>
              {cat}
            </Link>
          ))}
        </div>
        <a className="button button-dark mobile-menu-whatsapp" href={buildWhatsAppUrl('Assalāmu ʿalaykum, je souhaite vous contacter.')}>
          <MessageCircle size={18} /> WhatsApp
        </a>
      </aside>
    </div>
  );
}
