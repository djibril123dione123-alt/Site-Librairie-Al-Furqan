'use client';

import { Sparkles, X } from 'lucide-react';
import { categories } from '@/lib/al-furqan-data';

export type FilterKey = 'category' | 'language' | 'availability' | 'reading';

export function Filters({
  active,
  setActive,
  onClear,
}: {
  active: Record<FilterKey, string>;
  setActive: (key: FilterKey, value: string) => void;
  onClear: () => void;
}) {
  const groups: { key: FilterKey; label: string; values: string[] }[] = [
    { key: 'category', label: 'Catégorie', values: categories },
    { key: 'language', label: 'Langue', values: ['Français', 'Arabe', 'Français / Arabe'] },
    { key: 'availability', label: 'Disponibilité', values: ['Disponible', 'De retour en stock', 'Derniers exemplaires'] },
    { key: 'reading', label: 'Lecture', values: ['Hafs', 'Warsh'] },
  ];

  return (
    <aside className="filters">
      <div className="filter-top">
        <span>Filtrer par</span>
        <button onClick={onClear}>Tout effacer</button>
      </div>
      {groups.map((group) => (
        <div className="filter-group" key={group.key}>
          <strong>{group.label}</strong>
          {group.values.map((value) => (
            <label key={value}>
              <input
                type="checkbox"
                checked={active[group.key] === value}
                onChange={() => setActive(group.key, active[group.key] === value ? '' : value)}
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
      ))}
      <div className="filter-note">
        <Sparkles size={16} />
        <p>Astuce : recherchez « Warch » pour retrouver les éditions Warsh.</p>
      </div>
    </aside>
  );
}
