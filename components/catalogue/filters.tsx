'use client';

import { Sparkles } from 'lucide-react';
import type { CatalogueFacets, FacetOption } from '@/lib/data/facets';

export type FilterKey = 'category' | 'author' | 'publisher' | 'language' | 'availability' | 'reading' | 'tajwid';

/** Tajwid options carry raw "true"/"false" values — never surface those directly. */
function displayLabel(key: FilterKey, opt: FacetOption): string {
  if (key === 'tajwid') return opt.value === 'true' ? 'Avec Tajwid' : 'Sans Tajwid';
  return opt.value;
}

export function Filters({
  active,
  facets,
  setActive,
  onClear,
}: {
  active: Record<FilterKey, string>;
  facets?: CatalogueFacets;
  setActive: (key: FilterKey, value: string) => void;
  onClear: () => void;
}) {
  const groups: { key: FilterKey; label: string; options: FacetOption[] }[] = [
    { key: 'category' as FilterKey, label: 'Catégorie', options: facets?.categories || [] },
    { key: 'author' as FilterKey, label: 'Auteur', options: facets?.authors || [] },
    { key: 'publisher' as FilterKey, label: 'Éditeur', options: facets?.publishers || [] },
    { key: 'language' as FilterKey, label: 'Langue', options: facets?.languages || [] },
    { key: 'availability' as FilterKey, label: 'Disponibilité', options: facets?.availabilities || [] },
    { key: 'reading' as FilterKey, label: 'Lecture du Coran', options: facets?.readings || [] },
    { key: 'tajwid' as FilterKey, label: 'Tajwid', options: facets?.tajwid || [] },
  ].filter((g) => g.options.length > 0);

  const hasActive = Object.values(active).some(Boolean);

  return (
    <aside className="filters">
      <div className="filter-top">
        <span>Filtrer par</span>
        {hasActive && <button onClick={onClear}>Tout effacer</button>}
      </div>

      {groups.length === 0 ? (
        <div className="filter-empty">Aucun filtre disponible.</div>
      ) : (
        groups.map((group) => (
          <div className="filter-group" key={group.key} role="radiogroup" aria-label={group.label}>
            <strong>{group.label}</strong>
            {group.options.map((opt) => {
              const isActive = active[group.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`filter-option ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActive(group.key, isActive ? '' : opt.value)}
                >
                  <span className="filter-option-label">{displayLabel(group.key, opt)}</span>
                  <span className="filter-option-count">{opt.count}</span>
                </button>
              );
            })}
          </div>
        ))
      )}

      <div className="filter-note">
        <Sparkles size={16} />
        <p>Astuce : recherchez « Warch » pour retrouver les éditions Warsh.</p>
      </div>
    </aside>
  );
}
