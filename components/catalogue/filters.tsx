'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { seedCategories } from '@/lib/dev/seed-products';

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
