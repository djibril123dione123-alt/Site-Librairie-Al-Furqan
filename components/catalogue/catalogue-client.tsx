'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, X, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { trackBookRequest } from '@/lib/data/search';
import type { Product, Collection } from '@/lib/types/ui';
import type { CatalogueFacets } from '@/lib/data/facets';
import { BookCard } from '@/components/books/book-card';
import { Filters, FilterKey } from '@/components/catalogue/filters';
import { CatalogueEditorialBreak } from '@/components/catalogue/catalogue-editorial-break';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';

/** Minimum breadth before an editorial pause is worth the vertical space it costs. */
const EDITORIAL_BREAK_MIN_PRODUCTS = 8;

export function CatalogueClient({
  initialProducts,
  facets,
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  searchParams,
  collections = [],
}: {
  initialProducts: Product[];
  facets?: CatalogueFacets;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  searchParams: { [key: string]: string | undefined };
  collections?: Collection[];
}) {
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const categoryParam = searchParams['categorie'] || '';
  const authorParam = searchParams['auteur'] || '';
  const publisherParam = searchParams['editeur'] || '';
  const searchParam = searchParams['q'] || '';
  const newer = searchParams['nouveautes'] === '1';

  const languageParam = searchParams['language'] || '';
  const availabilityParam = searchParams['availability'] || '';
  const readingParam = searchParams['reading'] || '';
  const tajwidParam = searchParams['tajwid'] || '';
  const sortParam = searchParams['sort'] || 'Sélection Al Furqan';

  const active: Record<FilterKey, string> = {
    category: categoryParam,
    author: authorParam,
    publisher: publisherParam,
    language: languageParam,
    availability: availabilityParam,
    reading: readingParam,
    tajwid: tajwidParam,
  };
  const activeCount = Object.values(active).filter(Boolean).length;
  const hasActive = activeCount > 0;

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
  const setPage = (pageNumber: number) => updateUrl({ page: pageNumber.toString() });
  const clearAll = () => router.push('/catalogue', { scroll: false });
  const handleNoResultsWhatsApp = (queryStr: string) => trackBookRequest(queryStr, 'catalogue');

  // Mobile filter drawer — proper dialog semantics: focus in on open, trap
  // Tab within the drawer, Escape closes, focus restores to the trigger,
  // background scroll locked without a layout jump.
  useEffect(() => {
    if (!mobileFilters) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    drawerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileFilters(false);
      } else if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      previouslyFocused.current?.focus();
    };
  }, [mobileFilters]);

  const eyebrow = searchParam
    ? 'RECHERCHE'
    : active.category
    ? 'RAYON ÉDITORIAL'
    : active.author
    ? 'AUTEUR'
    : active.publisher
    ? 'ÉDITEUR'
    : newer
    ? 'À DÉCOUVRIR'
    : 'LE CATALOGUE';

  const title = searchParam
    ? `Résultats pour « ${searchParam} »`
    : active.category
    ? active.category
    : active.author
    ? `Livres de ${active.author}`
    : active.publisher
    ? `Éditions ${active.publisher}`
    : newer
    ? 'Nouveautés chez Al Furqan'
    : 'Le catalogue Al Furqan';

  const countDisplay = totalCount > 0 ? totalCount : initialProducts.length;

  // At most one real editorial pause, and never on search/narrow/small results.
  const showEditorialBreak =
    !searchParam && !hasActive && collections.length > 0 && countDisplay >= EDITORIAL_BREAK_MIN_PRODUCTS;
  const editorialCollection = showEditorialBreak ? collections[0] : null;
  const breakInsertAt = 8; // after the second row at 4 columns

  return (
    <main className="catalogue-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Catalogue' }]} />
      <div className="catalogue-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {countDisplay > 0 && (
            <p>
              {countDisplay} ouvrage{countDisplay > 1 ? 's' : ''} répertorié{countDisplay > 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <div className="catalogue-actions">
          <button
            ref={filterTriggerRef}
            className="mobile-filter-button"
            onClick={() => setMobileFilters(true)}
            aria-haspopup="dialog"
          >
            Filtrer {activeCount > 0 && <span>{activeCount}</span>}
          </button>
          <label className="sort-select">
            <span className="sort-select-text">Trier par</span>
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

      {hasActive && (
        <div className="active-filters">
          {Object.entries(active)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <button key={key} className="active-filter-chip" onClick={() => setActive(key as FilterKey, '')}>
                {key === 'tajwid' ? (value === 'true' ? 'Avec Tajwid' : 'Sans Tajwid') : value} <X size={12} />
              </button>
            ))}
          <button onClick={clearAll} className="active-filters-clear">
            Tout effacer
          </button>
        </div>
      )}

      <div className="catalogue-layout">
        <Filters active={active} facets={facets} setActive={setActive} onClear={clearAll} />
        <div className="catalogue-results">
          {initialProducts.length ? (
            <>
              <div className="book-grid">
                {initialProducts.map((product, i) => (
                  <div key={product.id} style={editorialCollection && i === breakInsertAt ? { gridColumn: '1 / -1' } : undefined}>
                    {editorialCollection && i === breakInsertAt && <CatalogueEditorialBreak collection={editorialCollection} />}
                    <BookCard product={product} />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination du catalogue">
                  <button
                    className="pagination-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <span className="pagination-status">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              mark="⌕"
              title="Aucun résultat"
              body={
                searchParam
                  ? `Aucun ouvrage ne correspond à « ${searchParam} ».`
                  : 'Aucun ouvrage ne correspond à cette combinaison de filtres.'
              }
            >
              {hasActive && (
                <button className="button button-cream" onClick={clearAll}>
                  Réinitialiser les filtres
                </button>
              )}
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
            </EmptyState>
          )}
        </div>
      </div>

      {mobileFilters && (
        <div className="filter-overlay" onClick={() => setMobileFilters(false)}>
          <div
            className="filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filtrer le catalogue"
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-heading">
              <h2>Filtrer le catalogue</h2>
              <button onClick={() => setMobileFilters(false)} aria-label="Fermer" data-autofocus>
                <X />
              </button>
            </div>
            <div className="sheet-body">
              <Filters active={active} facets={facets} setActive={setActive} onClear={clearAll} />
            </div>
            <button className="button button-dark sheet-submit" onClick={() => setMobileFilters(false)}>
              Afficher {countDisplay} ouvrage{countDisplay > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
