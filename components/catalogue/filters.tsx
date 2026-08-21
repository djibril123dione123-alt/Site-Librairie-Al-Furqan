'use client';

import { Sparkles } from 'lucide-react';
import type { CatalogueFacets, FacetOption } from '@/lib/data/facets';

export type FilterKey = 'category' | 'author' | 'publisher' | 'language' | 'availability' | 'reading';

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
  ].filter((g) => g.options.length > 0);

  return (
    <aside className="filters">
      <div className="filter-top">
        <span>Filtrer par</span>
        <button onClick={onClear}>Tout effacer</button>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--muted)' }}>
          Aucun filtre disponible.
        </div>
      ) : (
        groups.map((group) => (
          <div className="filter-group" key={group.key}>
            <strong>{group.label}</strong>
            {group.options.map((opt) => (
              <label key={opt.value}>
                <input
                  type="checkbox"
                  checked={active[group.key] === opt.value}
                  onChange={() => setActive(group.key, active[group.key] === opt.value ? '' : opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
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
