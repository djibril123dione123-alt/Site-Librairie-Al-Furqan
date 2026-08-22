'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight } from 'lucide-react';
import { getAutocompleteSuggestions } from '@/lib/data/products';
import { trackSearchEvent, trackBookRequest } from '@/lib/data/search';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { useStore } from '../providers';
import { Cover } from '../books/cover';
import type { Product } from '@/lib/types/ui';

interface SuggestionState {
  products: Product[];
  authors: string[];
  themes: string[];
}

const RECENT_SEARCHES_KEY = 'af-recent-searches';
const MAX_RECENT = 5;

function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecentSearch(query: string) {
  try {
    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = readRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...existing].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — silently skip, never blocks search
  }
}

export function SearchPanel() {
  const { searchOpen, setSearchOpen } = useStore();
  const [value, setValue] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<SuggestionState>({ products: [], authors: [], themes: [] });
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Global "/" shortcut — never fires while the visitor is already typing anywhere.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || searchOpen) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement)?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Focus management: move focus in on open, restore it to whatever
  // triggered the panel (header icon, hero search box, mobile menu...) on close.
  useEffect(() => {
    if (searchOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      setValue('');
      setRecentSearches(readRecentSearches());
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    previouslyFocused.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    setActiveIndex(-1);

    let isMounted = true;
    const fetchSuggestions = async () => {
      if (!value.trim()) {
        setSuggestions({ products: [], authors: [], themes: [] });
        return;
      }
      try {
        const result = await getAutocompleteSuggestions(value);
        if (isMounted) {
          setSuggestions(result);
        }
      } catch {
        if (isMounted) setSuggestions({ products: [], authors: [], themes: [] });
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [value]);

  const allItems = [...suggestions.products, ...suggestions.authors, ...suggestions.themes];
  const totalItems = allItems.length + (value ? 1 : 0);

  if (!searchOpen) return null;

  const onClose = () => setSearchOpen(false);

  const onSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      pushRecentSearch(trimmed);
      setSearchOpen(false);
      router.push(`/catalogue?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleBookRequest = (query: string) => {
    trackBookRequest(query, 'search');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.products.length) {
        const p = suggestions.products[activeIndex];
        pushRecentSearch(value);
        setSearchOpen(false);
        router.push(`/livres/${p.slug}`);
      } else {
        onSubmit();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="search-panel" role="dialog" aria-modal="true" aria-label="Recherche d'ouvrages" onClick={onClose}>
      <div className="search-panel-inner" onClick={(e) => e.stopPropagation()}>
        <div className="search-line">
          <Search size={21} />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Titre, auteur, thème, ISBN, éditeur…"
            aria-label="Champ de recherche d'ouvrages"
            aria-controls="search-suggestions"
          />
          {value && (
            <button onClick={() => setValue('')} aria-label="Effacer la recherche" className="search-clear">
              <X size={16} />
            </button>
          )}
          <button onClick={onClose} aria-label="Fermer la recherche">
            <X size={21} />
          </button>
        </div>
        {value ? (
          <div className="search-suggestions" id="search-suggestions" role="listbox">
            {suggestions.products.length > 0 && (
              <div className="suggestion-group">
                <span className="suggestion-label">Livres</span>
                {suggestions.products.map((product, i) => (
                  <Link
                    href={`/livres/${product.slug}`}
                    key={product.id}
                    onClick={() => { pushRecentSearch(value); onClose(); }}
                    className={`suggestion-item ${activeIndex === i ? 'is-active' : ''}`}
                    role="option"
                    aria-selected={activeIndex === i}
                  >
                    <Cover product={product as any} small />
                    <span>
                      <strong>{product.title}</strong>
                      <small>
                        {product.author && product.author !== 'Auteur inconnu'
                          ? `${product.author} · ${product.category}`
                          : product.category}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            )}

            {suggestions.authors.length > 0 && (
              <div className="suggestion-group">
                <span className="suggestion-label">Auteurs</span>
                {suggestions.authors.map((author, i) => (
                  <button
                    key={author}
                    className={`suggestion-item suggestion-text ${
                      activeIndex === suggestions.products.length + i ? 'is-active' : ''
                    }`}
                    onClick={() => setValue(author)}
                  >
                    <strong>{author}</strong>
                  </button>
                ))}
              </div>
            )}

            {suggestions.themes.length > 0 && (
              <div className="suggestion-group">
                <span className="suggestion-label">Thèmes</span>
                {suggestions.themes.map((theme, i) => (
                  <button
                    key={theme}
                    className={`suggestion-item suggestion-text ${
                      activeIndex === suggestions.products.length + suggestions.authors.length + i ? 'is-active' : ''
                    }`}
                    onClick={() => setValue(theme)}
                  >
                    <strong>{theme}</strong>
                  </button>
                ))}
              </div>
            )}

            {allItems.length === 0 ? (
              <div className="empty-search">
                <strong>Nous n&apos;avons pas trouvé cet ouvrage.</strong>
                <p>
                  Cet ouvrage n&apos;est pas encore disponible en ligne. Vous pouvez transmettre votre demande directement à la librairie.
                </p>
                <div className="empty-search-actions">
                  <Link href="/catalogue" className="text-link" onClick={onClose}>
                    Voir le catalogue
                  </Link>
                  <a
                    className="button button-dark"
                    onClick={() => handleBookRequest(value)}
                    href={buildWhatsAppUrl(
                      `Assalāmu ʿalaykum,\nje recherche l’ouvrage « ${value} ».\nL’avez-vous actuellement en stock ou pouvez-vous l’obtenir ?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Demander sur WhatsApp <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            ) : (
              <button
                className={`search-all ${activeIndex === totalItems - 1 ? 'is-active' : ''}`}
                onClick={onSubmit}
              >
                Voir tous les résultats pour « {value} » <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : recentSearches.length > 0 ? (
          <div className="popular-search">
            <span>Recherches récentes</span>
            <div>
              {recentSearches.map((term) => (
                <button key={term} onClick={() => setValue(term)}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="search-quiet-empty">
            <p>Recherchez un titre, un auteur, un thème ou un ISBN.</p>
          </div>
        )}
      </div>
    </div>
  );
}
