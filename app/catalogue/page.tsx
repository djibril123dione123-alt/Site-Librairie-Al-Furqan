'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, X, MessageCircle } from 'lucide-react';
import { searchProducts, buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { BookCard } from '@/components/books/book-card';
import { Filters, FilterKey } from '@/components/catalogue/filters';

function CatalogueContent() {
  const params = useSearchParams();
  const categoryParam = params.get('categorie') || '';
  const searchParam = params.get('q') || '';
  const newer = params.get('nouveautes') === '1';
  
  const languageParam = params.get('language') || '';
  const availabilityParam = params.get('availability') || '';
  const readingParam = params.get('reading') || '';
  const sortParam = params.get('sort') || 'Pertinence';
  
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);

  const active: Record<FilterKey, string> = {
    category: categoryParam,
    language: languageParam,
    availability: availabilityParam,
    reading: readingParam,
  };

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(params.entries()));
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) current.delete(key);
        else current.set(key, value);
      });
      const search = current.toString();
      router.push(search ? `?${search}` : '/catalogue', { scroll: false });
    },
    [params, router]
  );

  const setActive = useCallback(
    (key: FilterKey, value: string) => {
      const paramKey = key === 'category' ? 'categorie' : key;
      updateUrl({ [paramKey]: value });
    },
    [updateUrl]
  );

  const setSort = (val: string) => updateUrl({ sort: val });

  const filtered = useMemo(() => {
    let list = searchProducts(searchParam);
    list = list.filter(
      (p) =>
        (!categoryParam || p.category === categoryParam) &&
        (!languageParam || p.language === languageParam) &&
        (!availabilityParam || p.availability === availabilityParam) &&
        (!readingParam || p.reading === readingParam) &&
        (!newer || p.newArrival)
    );
    if (sortParam === 'Prix croissant') list = [...list].sort((a, b) => a.price - b.price);
    if (sortParam === 'Prix décroissant') list = [...list].sort((a, b) => b.price - a.price);
    if (sortParam === 'Nouveautés') list = [...list].sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
    return list;
  }, [categoryParam, languageParam, availabilityParam, readingParam, newer, searchParam, sortParam]);

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
            {filtered.length} ouvrage{filtered.length > 1 ? 's' : ''} à découvrir.
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
          {filtered.length ? (
            <div className="book-grid">
              {filtered.map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <span className="no-results-mark">⌕</span>
              <h2>Aucun résultat pour « {searchParam || active.category} »</h2>
              <p>Essayez une recherche plus générale ou demandez cet ouvrage directement à Al Furqan.</p>
              <a
                className="button button-dark"
                href={buildWhatsAppUrl(
                  `Assalāmu ʿalaykum,\nje recherche l’ouvrage « ${
                    searchParam || active.category
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
              Afficher {filtered.length} livre{filtered.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<div style={{ padding: '100px 32px' }}>Chargement du catalogue...</div>}>
      <CatalogueContent />
    </Suspense>
  );
}
