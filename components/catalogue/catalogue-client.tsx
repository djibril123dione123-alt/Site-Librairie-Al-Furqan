'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, X, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { trackBookRequest } from '@/lib/data/search';
import type { Product } from '@/lib/types/ui';
import type { CatalogueFacets } from '@/lib/data/facets';
import { BookCard } from '@/components/books/book-card';
import { Filters, FilterKey } from '@/components/catalogue/filters';

export function CatalogueClient({
  initialProducts,
  facets,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  searchParams,
}: {
  initialProducts: Product[];
  facets?: CatalogueFacets;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  searchParams: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);

  const categoryParam = searchParams['categorie'] || '';
  const authorParam = searchParams['auteur'] || '';
  const publisherParam = searchParams['editeur'] || '';
  const searchParam = searchParams['q'] || '';
  const newer = searchParams['nouveautes'] === '1';
  
  const languageParam = searchParams['language'] || '';
  const availabilityParam = searchParams['availability'] || '';
  const readingParam = searchParams['reading'] || '';
  const sortParam = searchParams['sort'] || 'Sélection Al Furqan';

  const active: Record<FilterKey, string> = {
    category: categoryParam,
    author: authorParam,
    publisher: publisherParam,
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
      const paramKey = key === 'category' ? 'categorie' : key === 'author' ? 'auteur' : key === 'publisher' ? 'editeur' : key;
      updateUrl({ [paramKey]: value, page: '1' });
    },
    [updateUrl]
  );

  const setSort = (val: string) => updateUrl({ sort: val, page: '1' });

  const setPage = (pageNumber: number) => {
    updateUrl({ page: pageNumber.toString() });
  };

  const clearAll = () => {
    router.push('/catalogue', { scroll: false });
  };

  const handleNoResultsWhatsApp = (queryStr: string) => {
    trackBookRequest(queryStr, 'catalogue');
  };

  const title = searchParam
    ? `Résultats pour « ${searchParam} »`
    : active.category
    ? active.category
    : newer
    ? 'Nouveautés chez Al Furqan'
    : 'Le catalogue Al Furqan';

  const countDisplay = totalCount > 0 ? totalCount : initialProducts.length;

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
            {countDisplay} ouvrage{countDisplay > 1 ? 's' : ''} répertorié{countDisplay > 1 ? 's' : ''}.
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
              <option>Sélection Al Furqan</option>
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
        <Filters active={active} facets={facets} setActive={setActive} onClear={clearAll} />
        <div className="catalogue-results">
          {initialProducts.length ? (
            <>
              <div className="book-grid">
                {initialProducts.map((product) => (
                  <BookCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 }}>
                  <button
                    className="button button-cream btn-sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    style={{ opacity: currentPage <= 1 ? 0.4 : 1, padding: '8px 14px' }}
                  >
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    className="button button-cream btn-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    style={{ opacity: currentPage >= totalPages ? 0.4 : 1, padding: '8px 14px' }}
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-results">
              <span className="no-results-mark">⌕</span>
              <h2>Aucun résultat pour « {searchParam || active.category || 'cette recherche'} »</h2>
              <p>Essayez une recherche plus générale ou demandez cet ouvrage directement à Al Furqan.</p>
              <a
                className="button button-dark"
                onClick={() => handleNoResultsWhatsApp(searchParam || active.category || 'catalogue-no-results')}
                href={buildWhatsAppUrl(
                  `Assalāmu ʿalaykum,\nje recherche l’ouvrage « ${
                    searchParam || active.category || 'particulier'
                  } ».\nL’avez-vous actuellement ou pouvez-vous l’obtenir ?`
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} /> Demander cet ouvrage sur WhatsApp
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
            <Filters active={active} facets={facets} setActive={setActive} onClear={clearAll} />
            <button className="button button-dark sheet-submit" onClick={() => setMobileFilters(false)}>
              Afficher les résultats
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
