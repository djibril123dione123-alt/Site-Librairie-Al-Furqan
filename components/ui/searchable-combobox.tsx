'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableComboboxProps {
  options: (string | ComboboxOption)[];
  value: string;
  onChange: (val: string) => void;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyText?: string;
  customFallbackOption?: string;
}

function removeAccents(str: string) {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
}

export function SearchableCombobox({
  options,
  value,
  onChange,
  onSearchChange,
  loading = false,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  disabled = false,
  emptyText = "Aucun résultat trouvé",
  customFallbackOption
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: ComboboxOption[] = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (onSearchChange) return normalizedOptions; // Server filtered
    if (!search.trim()) return normalizedOptions.slice(0, 100);
    const q = removeAccents(search.trim());
    return normalizedOptions
      .filter(opt => removeAccents(opt.label).includes(q) || (opt.sublabel && removeAccents(opt.sublabel).includes(q)))
      .slice(0, 100);
  }, [normalizedOptions, search, onSearchChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const selectedOption = normalizedOptions.find(o => o.value === value) || (value ? { value, label: value } : null);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-[#e3dcd1] bg-[#fbf9f4] p-3 rounded-md text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-[#b28a52]"
      >
        <span className={selectedOption ? 'text-[#1a1a2e] font-medium' : 'text-[#64736f]'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-[#8c7b6c] shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-[#fbf9f4] border border-[#e3dcd1] rounded-md shadow-xl max-h-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
          <div className="p-2 border-b border-[#e3dcd1] bg-[#f4ebd8] flex items-center gap-2">
            <Search size={16} className="text-[#8c7b6c] shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={handleInputChange}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm focus:outline-none text-[#1a1a2e]"
            />
            {loading && <Loader2 size={14} className="animate-spin text-[#b28a52] shrink-0" />}
            {search && !loading && (
              <button 
                type="button" 
                onClick={() => {
                  setSearch('');
                  if (onSearchChange) onSearchChange('');
                }} 
                className="text-[#8c7b6c] hover:text-[#1a1a2e]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-56 p-1">
            {filteredOptions.length === 0 && !loading ? (
              <div className="p-3 text-xs text-[#64736f] text-center">{emptyText}</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded text-xs text-left transition-colors ${
                    value === opt.value ? 'bg-[#b28a52] text-white font-medium' : 'hover:bg-[#f4ebd8] text-[#1a1a2e]'
                  }`}
                >
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    {opt.sublabel && <div className="text-[10px] opacity-75">{opt.sublabel}</div>}
                  </div>
                  {value === opt.value && <Check size={14} />}
                </button>
              ))
            )}

            {customFallbackOption && (
              <button
                type="button"
                onClick={() => {
                  onChange(customFallbackOption);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="w-full mt-1 border-t border-[#e3dcd1] p-2.5 text-xs text-[#b28a52] font-semibold text-left hover:bg-[#f4ebd8]"
              >
                + {customFallbackOption}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
