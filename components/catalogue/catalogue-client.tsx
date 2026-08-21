'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, X, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import type { Product } from '@/lib/types/ui';
import { BookCard } from '@/components/books/book-card';
import { Filters, FilterKey } from '@/components/catalogue/filters';

export function CatalogueClient({
  initialProducts,
  searchParams,
}: {
  initialProducts: Product[];
  searchParams: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);

  const categoryParam = searchParams['categorie'] || '';
  const searchParam = searchParams['q'] || '';
  const newer = searchParams['nouveautes'] === '1';
  
  const languageParam = searchParams['language'] || '';
  const availabilityParam = searchParams['availability'] || '';
  const readingParam = searchParams['reading'] || '';
  const sortParam = searchParams['sort'] || 'Pertinence';

  const active: Record<FilterKey, string> = {
    category: categoryParam,
    language: languageParam,
    availability: availabilityParam,
    reading: readingParam,
  };

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const current = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) current.delete(key);
        else current.set(key, value);
      });
      const search = current.toString();
      router.push(search ? `?${search}` : '/catalogue', { scroll: false });
    },
    [router]
  );

  const setActive = useCallback(
    (key: FilterKey, value: string) => {
      const paramKey = key === 'category' ? 'categorie' : key;
      updateUrl({ [paramKey]: value });
    },
    [updateUrl]
  );

  const setSort = (val: string) => updateUrl({ sort: val });

  // Les produits sont déjà filtrés par le backend pour les critères stricts.
  // Le tri est fait côté client car il est léger et immédiat.
  const sorted = useMemo(() => {
    let list = [...initialProducts];
    if (sortParam === 'Prix croissant') list.sort((a, b) => a.price - b.price);
    if (sortParam === 'Prix décroissant') list.sort((a, b) => b.price - a.price);
    if (sortParam === 'Nouveautés') list.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    return list;
  }, [initialProducts, sortParam]);

  const clearAll = () => {
    router.push('/catalogue', { scroll: false });
  };

  const title = searchParam
    ? `Résultats pour « ${searchParam} »`
    : active.category
    ? active.category
    : newer
    ? 'Nouveautés chez Al Furqan'
    : 'Le catalogue Al Furqan';

  return (
    <main className="catalogue-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>Catalogue</span>
      </div>
      <div className="catalogue-heading">
        <div>
          <span className="eyebrow">LE CATALOGUE</span>
          <h1>{title}</h1>
          <p>
            {sorted.length} ouvrage{sorted.length > 1 ? 's' : ''} à découvrir.
          </p>
        </div>
        <div className="catalogue-actions">
          <button className="mobile-filter-button" onClick={() => setMobileFilters(true)}>
            Filtrer{' '}
            {Object.values(active).filter(Boolean).length > 0 && (
              <span>{Object.values(active).filter(Boolean).length}</span>
            )}
          </button>
          <label className="sort-select">
            Trier par{' '}
            <select value={sortParam} onChange={(e) => setSort(e.target.value)} aria-label="Trier">
              <option>Pertinence</option>
              <option>Nouveautés</option>
              <option>Prix croissant</option>
              <option>Prix décroissant</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
      </div>
      <div className="active-chips">
        {Object.entries(active)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <button key={key} onClick={() => setActive(key as FilterKey, '')}>
              {value} <X size={13} />
            </button>
          ))}
        {Object.values(active).some(Boolean) && (
          <button onClick={clearAll} className="clear-chips">
            Tout effacer
          </button>
        )}
      </div>
      <div className="catalogue-layout">
        <Filters active={active} setActive={setActive} onClear={clearAll} />
        <div className="catalogue-results">
          {sorted.length ? (
            <div className="book-grid">
              {sorted.map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <span className="no-results-mark">⌕</span>
              <h2>Aucun résultat pour « {searchParam || active.category || 'cette recherche'} »</h2>
              <p>Essayez une recherche plus générale ou demandez cet ouvrage directement à Al Furqan.</p>
              <a
                className="button button-dark"
                href={buildWhatsAppUrl(
                  `Assalāmu ʿalaykum,\nje recherche l’ouvrage « ${
                    searchParam || active.category || 'particulier'
                  } ».\nL’avez-vous actuellement ou pouvez-vous l’obtenir ?`
                )}
              >
                <MessageCircle size={17} /> Demander cet ouvrage
              </a>
            </div>
          )}
        </div>
      </div>
      {mobileFilters && (
        <div className="filter-overlay">
          <div className="filter-sheet">
            <div className="sheet-heading">
              <h2>Filtrer le catalogue</h2>
              <button onClick={() => setMobileFilters(false)} aria-label="Fermer">
                <X />
              </button>
            </div>
            <Filters active={active} setActive={setActive} onClear={clearAll} />
            <button className="button button-dark sheet-submit" onClick={() => setMobileFilters(false)}>
              Afficher {sorted.length} livre{sorted.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
