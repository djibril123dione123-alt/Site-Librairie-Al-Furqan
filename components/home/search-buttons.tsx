'use client';

import { Search, ArrowRight } from 'lucide-react';
import { useStore } from '../providers';

export function HomeSearchButton() {
  const { setSearchOpen } = useStore();
  
  return (
    <button className="hero-search" onClick={() => setSearchOpen(true)}>
      <Search size={18} />
      <span>Quel livre recherchez-vous ?</span>
      <span className="search-key">⌘ K</span>
    </button>
  );
}

export function QuickSearchBox() {
  const { setSearchOpen } = useStore();

  return (
    <button onClick={() => setSearchOpen(true)} className="search-box" aria-label="Rechercher">
      <Search size={19} />
      <span>Rechercher un titre, un auteur, un thème, un ISBN…</span>
      <ArrowRight size={18} />
    </button>
  );
}
