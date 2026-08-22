'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, X, MessageCircle, Search, Heart, ShoppingBag } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';
import { createBrowserClient } from '@/lib/supabase/client';
import { seedCategories } from '@/lib/dev/seed-products';

export function MobileMenu() {
  const { menuOpen, setMenuOpen, setSearchOpen, setCartOpen, cartCount, wishlistCount } = useStore();
  const [categories, setCategories] = useState<string[]>([]);
  
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
          <button
            onClick={() => {
              setMenuOpen(false);
              setCartOpen(true);
            }}
          >
            <ShoppingBag size={18} /> Panier {cartCount > 0 && <i>{cartCount}</i>}
          </button>
        </div>
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
