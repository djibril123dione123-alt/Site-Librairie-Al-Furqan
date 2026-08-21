'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Navigation, Building, Truck, ChevronRight, ExternalLink } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox';

export type DeliveryMethod = 'standard' | 'la_poste';

export interface LocationData {
  region: string;
  department?: string;
  commune?: string;
  locality: string;
  quartier?: string;
  repere?: string;
  isCustomLocality?: boolean;
}

export interface PostOffice {
  id: string;
  name: string;
  address: string | null;
  region: string | null;
  locality: string | null;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  isCustomOffice?: boolean;
}

interface DeliveryFormProps {
  onValidSubmit: (data: { method: DeliveryMethod; location: LocationData; postOffice?: PostOffice }) => void;
  initialData?: {
    method?: DeliveryMethod;
    location?: LocationData;
    postOffice?: PostOffice;
  };
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const FALLBACK_REGIONS = [
  'DAKAR', 'DIOURBEL', 'FATICK', 'KAFFRINE', 'KAOLACK', 'KEDOUGOU',
  'KOLDA', 'LOUGA', 'MATAM', 'SAINT-LOUIS', 'SEDHIOU', 'TAMBACOUNDA',
  'THIES', 'ZIGUINCHOR'
];

export function DeliveryForm({ onValidSubmit, initialData }: DeliveryFormProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  
  const [method, setMethod] = useState<DeliveryMethod | null>(initialData?.method || null);
  
  // Server-driven geographic state
  const [regions, setRegions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [localitiesOptions, setLocalitiesOptions] = useState<ComboboxOption[]>([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(false);
  
  const [selectedRegion, setSelectedRegion] = useState(initialData?.location?.region || '');
  const [selectedDept, setSelectedDept] = useState(initialData?.location?.department || '');
  const [selectedCommune, setSelectedCommune] = useState(initialData?.location?.commune || '');
  const [selectedLocality, setSelectedLocality] = useState(initialData?.location?.locality || '');
  
  const [customLocalityInput, setCustomLocalityInput] = useState('');
  const [quartier, setQuartier] = useState(initialData?.location?.quartier || '');
  const [repere, setRepere] = useState(initialData?.location?.repere || '');
  
  // Post offices state
  const [allOffices, setAllOffices] = useState<PostOffice[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<PostOffice | null>(initialData?.postOffice || null);
  const [customOfficeInput, setCustomOfficeInput] = useState('');
  const [isCustomOffice, setIsCustomOffice] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [officeSearch, setOfficeSearch] = useState('');

  // 1. Fetch Regions via RPC or Fallback
  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data, error } = await supabase.rpc('get_senegal_regions');
        if (error || !data || data.length === 0) {
          // Direct fallback query if RPC not yet indexed in client cache
          const { data: dFallback } = await supabase.from('senegal_locations').select('region').limit(25000);
          if (dFallback && dFallback.length > 0) {
            const uniqueRegs = Array.from(new Set(dFallback.map(d => d.region))).sort();
            setRegions(uniqueRegs);
            return;
          }
          throw new Error("RPC failed");
        }
        const regs = data.map((r: any) => r.region).filter(Boolean);
        setRegions(regs.length > 0 ? regs : FALLBACK_REGIONS);
      } catch (err) {
        setRegions(FALLBACK_REGIONS);
      }
    }
    fetchRegions();
  }, [supabase]);

  // 2. Fetch Departments via RPC
  useEffect(() => {
    if (!selectedRegion) {
      setDepartments([]);
      setSelectedDept('');
      return;
    }
    async function fetchDepts() {
      try {
        const { data, error } = await supabase.rpc('get_senegal_departments', { p_region: selectedRegion });
        if (!error && data) {
          setDepartments(data.map((d: any) => d.department).filter(Boolean));
        } else {
          setDepartments([]);
        }
      } catch (err) {
        setDepartments([]);
      }
    }
    fetchDepts();
  }, [selectedRegion, supabase]);

  // 3. Fetch Communes via RPC
  useEffect(() => {
    if (!selectedRegion) {
      setCommunes([]);
      setSelectedCommune('');
      return;
    }
    async function fetchCommunes() {
      try {
        const { data, error } = await supabase.rpc('get_senegal_communes', { 
          p_region: selectedRegion, 
          p_department: selectedDept || null 
        });
        if (!error && data) {
          setCommunes(data.map((c: any) => c.commune).filter(Boolean));
        } else {
          setCommunes([]);
        }
      } catch (err) {
        setCommunes([]);
      }
    }
    fetchCommunes();
  }, [selectedRegion, selectedDept, supabase]);

  // 4. Server-side Locality Search via RPC
  const searchLocalitiesServer = useCallback(async (queryText: string) => {
    if (!selectedRegion) return;
    setLocalitiesLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_senegal_localities', {
        p_region: selectedRegion,
        p_department: selectedDept || null,
        p_commune: selectedCommune || null,
        p_query: queryText || null,
        p_limit: 50
      });

      if (!error && data) {
        const opts: ComboboxOption[] = data.map((item: any) => ({
          value: item.locality,
          label: item.locality,
          sublabel: [item.commune, item.department, item.region].filter(Boolean).join(' · ')
        }));
        setLocalitiesOptions(opts);
      }
    } catch (err) {
      console.error('Locality search error:', err);
    } finally {
      setLocalitiesLoading(false);
    }
  }, [selectedRegion, selectedDept, selectedCommune, supabase]);

  useEffect(() => {
    if (selectedRegion) {
      searchLocalitiesServer('');
    } else {
      setLocalitiesOptions([]);
      setSelectedLocality('');
    }
  }, [selectedRegion, selectedDept, selectedCommune, searchLocalitiesServer]);

  // 5. Fetch ALL 129 Cartographed Post Offices
  useEffect(() => {
    if (method !== 'la_poste') {
      setAllOffices([]);
      return;
    }
    async function fetchAllOffices() {
      try {
        const { data, error } = await supabase
          .from('delivery_points')
          .select('*')
          .eq('provider', 'la_poste')
          .eq('is_active', true);
          
        if (error) throw error;
        setAllOffices(data || []);
      } catch (err) {
        console.error('Failed to load post offices');
      }
    }
    fetchAllOffices();
  }, [method, supabase]);

  // Haversine Geolocation across ALL cartographed offices
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée par votre navigateur.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        
        const validOffices = allOffices.filter(o => o.latitude !== null && o.longitude !== null);
        if (validOffices.length > 0) {
          const withDistance = validOffices.map(o => ({
            ...o,
            distanceKm: getDistanceFromLatLonInKm(latitude, longitude, Number(o.latitude), Number(o.longitude))
          })).sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
          
          setAllOffices(withDistance);
          setSelectedOffice(withDistance[0]);
          setIsCustomOffice(false);
        }
      },
      () => {
        setLocating(false);
        setGeoError('Géolocalisation refusée. Veuillez choisir votre bureau ci-dessous.');
      }
    );
  };

  // Filtered offices for display
  const displayedOffices = useMemo(() => {
    let list = allOffices;
    
    // Filter by region if user selected a region AND office has region defined
    if (selectedRegion) {
      const regUpper = selectedRegion.toUpperCase();
      const filteredByReg = list.filter(o => !o.region || o.region.toUpperCase() === regUpper);
      if (filteredByReg.length > 0) list = filteredByReg;
    }

    if (officeSearch.trim()) {
      const q = officeSearch.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q) || (o.address && o.address.toLowerCase().includes(q)));
    }

    return list;
  }, [allOffices, selectedRegion, officeSearch]);

  const finalLocality = selectedLocality === "Je ne trouve pas ma localité" ? customLocalityInput : selectedLocality;

  const isFormValid = Boolean(
    method &&
    selectedRegion &&
    finalLocality.trim().length > 0 &&
    (method === 'la_poste' ? (isCustomOffice ? customOfficeInput.trim().length > 0 : selectedOffice !== null) : quartier.trim().length > 0)
  );

  const handleNext = () => {
    if (!isFormValid) return;
    
    onValidSubmit({
      method: method!,
      location: { 
        region: selectedRegion, 
        department: selectedDept,
        commune: selectedCommune,
        locality: finalLocality, 
        quartier, 
        repere,
        isCustomLocality: selectedLocality === "Je ne trouve pas ma localité"
      },
      postOffice: method === 'la_poste' ? (
        isCustomOffice 
          ? { id: 'custom', name: customOfficeInput, address: null, region: selectedRegion || null, locality: null, latitude: 0, longitude: 0, isCustomOffice: true } 
          : selectedOffice!
      ) : undefined
    });
  };

  return (
    <div className="delivery-form-container space-y-8">
      {/* 1. Mode de réception */}
      <div className="step-block">
        <h3 className="serif text-xl font-medium mb-4">1. Mode de réception</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`delivery-method-card p-5 border-2 rounded-xl cursor-pointer transition-all ${method === 'standard' ? 'border-[var(--gold)] bg-[var(--paper)]' : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--gold)]'}`}>
            <input 
              type="radio" 
              name="method" 
              value="standard" 
              className="sr-only"
              checked={method === 'standard'}
              onChange={() => setMethod('standard')} 
            />
            <Truck size={24} className="mb-3 text-[var(--gold)]" />
            <strong className="block serif text-lg mb-1">Livraison à une adresse</strong>
            <p className="text-xs text-[var(--muted)]">Livraison à domicile, bureau ou quartier au Sénégal.</p>
          </label>
          
          <label className={`delivery-method-card p-5 border-2 rounded-xl cursor-pointer transition-all ${method === 'la_poste' ? 'border-[var(--gold)] bg-[var(--paper)]' : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--gold)]'}`}>
            <input 
              type="radio" 
              name="method" 
              value="la_poste" 
              className="sr-only"
              checked={method === 'la_poste'}
              onChange={() => setMethod('la_poste')} 
            />
            <Building size={24} className="mb-3 text-[var(--gold)]" />
            <strong className="block serif text-lg mb-1">La Poste Sénégal</strong>
            <p className="text-xs text-[var(--muted)]">Retrait dans un bureau de poste cartographié.</p>
          </label>
        </div>
      </div>

      {/* 2. Hiérarchie géographique */}
      {method && (
        <div className="step-block border-t border-[var(--line)] pt-8 animate-in fade-in space-y-6">
          <h3 className="serif text-xl font-medium">2. Localisation (ANSD RGPH-5 2023)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Région */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Région (14 régions du Sénégal)</label>
              <SearchableCombobox
                options={regions}
                value={selectedRegion}
                onChange={(val) => {
                  setSelectedRegion(val);
                  setSelectedDept('');
                  setSelectedCommune('');
                  setSelectedLocality('');
                }}
                placeholder="Sélectionner une région..."
                searchPlaceholder="Rechercher une région..."
              />
            </div>

            {/* Département */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Département (Optionnel)</label>
              <SearchableCombobox
                options={departments}
                value={selectedDept}
                disabled={!selectedRegion || departments.length === 0}
                onChange={(val) => {
                  setSelectedDept(val);
                  setSelectedCommune('');
                  setSelectedLocality('');
                }}
                placeholder={!selectedRegion ? "Choisissez une région d'abord" : "Sélectionner un département..."}
                searchPlaceholder="Rechercher un département..."
              />
            </div>

            {/* Commune */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Commune / Arrondissement (Optionnel)</label>
              <SearchableCombobox
                options={communes}
                value={selectedCommune}
                disabled={!selectedRegion || communes.length === 0}
                onChange={(val) => {
                  setSelectedCommune(val);
                  setSelectedLocality('');
                }}
                placeholder={!selectedRegion ? "Choisissez une région d'abord" : "Sélectionner une commune..."}
                searchPlaceholder="Rechercher une commune..."
              />
            </div>

            {/* Localité / Quartier (Serveur Search Engine) */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Localité / Quartier / Village</label>
              <SearchableCombobox
                options={localitiesOptions}
                value={selectedLocality}
                disabled={!selectedRegion}
                loading={localitiesLoading}
                onChange={(val) => setSelectedLocality(val)}
                onSearchChange={(q) => searchLocalitiesServer(q)}
                placeholder={!selectedRegion ? "Choisissez une région d'abord" : "Rechercher une localité..."}
                searchPlaceholder="Tapez un nom de village, quartier..."
                customFallbackOption="Je ne trouve pas ma localité"
              />
            </div>
          </div>

          {/* Fallback Saisie Manuelle Localité */}
          {selectedLocality === "Je ne trouve pas ma localité" && (
            <div className="bg-[var(--paper)] p-4 rounded-lg border border-[var(--gold)] animate-in fade-in">
              <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Saisissez le nom de votre localité</label>
              <input 
                type="text" 
                value={customLocalityInput}
                onChange={(e) => setCustomLocalityInput(e.target.value)}
                placeholder="Ex: Touba Mosquée, Village de Ndiemane..."
                className="w-full border border-[var(--line)] bg-[var(--bg)] p-3 rounded-md text-sm"
              />
              <p className="text-[11px] text-[var(--muted)] mt-1">Cette précision sera transmise directement avec votre commande WhatsApp.</p>
            </div>
          )}

          {/* Champs Adresse Supplémentaires */}
          {method === 'standard' && selectedLocality && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Quartier / Rue (Requis)</label>
                <input 
                  type="text" 
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  placeholder="Ex: Sicap Liberté 5, Rue 10"
                  className="w-full border border-[var(--line)] bg-[var(--bg)] p-3 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Repère / Précision (Optionnel)</label>
                <input 
                  type="text" 
                  value={repere}
                  onChange={(e) => setRepere(e.target.value)}
                  placeholder="Ex: Près de la mosquée, Villa 102..."
                  className="w-full border border-[var(--line)] bg-[var(--bg)] p-3 rounded-md text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Sélection Bureau La Poste */}
      {method === 'la_poste' && (
        <div className="step-block border-t border-[var(--line)] pt-8 animate-in fade-in space-y-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h3 className="serif text-xl font-medium">3. Bureau de Poste ({allOffices.length} points cartographiés)</h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">Points de service officiellement cartographiés par La Poste Sénégal.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={handleGeolocation} 
                disabled={locating}
                className="text-xs text-[var(--gold)] flex items-center gap-1.5 hover:underline disabled:opacity-50 border border-[var(--gold)] bg-[var(--paper)] px-3 py-2 rounded-md font-medium"
              >
                <Navigation size={14} /> 
                {locating ? 'Géolocalisation...' : 'Trouver le plus proche'}
              </button>
              
              <a 
                href="https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--muted)] flex items-center gap-1 hover:text-[var(--gold)] underline"
              >
                Carte officielle <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <p className="text-[11px] text-[var(--muted)]">Votre position sert uniquement à trouver les bureaux de poste les plus proches.</p>
          {geoError && <p className="text-xs text-red-500 font-medium">{geoError}</p>}

          <div className="mb-3">
            <input
              type="text"
              value={officeSearch}
              onChange={(e) => setOfficeSearch(e.target.value)}
              placeholder="Filtrer les bureaux de poste par nom..."
              className="w-full border border-[var(--line)] bg-[var(--bg)] p-2.5 rounded-md text-xs"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
            {displayedOffices.map(office => (
              <label 
                key={office.id} 
                className={`office-card p-4 border rounded-xl cursor-pointer transition-all ${
                  !isCustomOffice && selectedOffice?.id === office.id 
                    ? 'border-[var(--gold)] bg-[var(--paper)]' 
                    : 'border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--paper)]/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="office" 
                    value={office.id}
                    checked={!isCustomOffice && selectedOffice?.id === office.id}
                    onChange={() => {
                      setSelectedOffice(office);
                      setIsCustomOffice(false);
                    }}
                    className="mt-1 accent-[var(--gold)]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="block text-sm text-[var(--ink)]">{office.name}</strong>
                      {office.region && (
                        <span className="text-[10px] bg-[var(--line)]/50 text-[var(--muted)] px-2 py-0.5 rounded">
                          {office.region}
                        </span>
                      )}
                    </div>
                    {office.address && (
                      <span className="text-xs text-[var(--muted)] flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-[var(--gold)]" /> {office.address}
                      </span>
                    )}
                  </div>
                  {office.distanceKm !== undefined && (
                    <span className="text-xs font-semibold text-[var(--gold)] bg-white border border-[var(--line)] px-2.5 py-1 rounded-full shadow-sm">
                      ≈ {office.distanceKm.toFixed(1)} km
                    </span>
                  )}
                </div>
              </label>
            ))}

            {/* Saisie Manuelle Bureau Si non trouvé */}
            <label 
              className={`office-card p-4 border rounded-xl cursor-pointer transition-all ${
                isCustomOffice ? 'border-[var(--gold)] bg-[var(--paper)]' : 'border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--paper)]/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <input 
                  type="radio" 
                  name="office" 
                  value="custom"
                  checked={isCustomOffice}
                  onChange={() => {
                    setIsCustomOffice(true);
                    setSelectedOffice(null);
                  }}
                  className="mt-1 accent-[var(--gold)]"
                />
                <div className="flex-1">
                  <strong className="block text-sm text-[var(--gold)]">+ Je ne trouve pas mon bureau (saisie manuelle)</strong>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Indiquez le nom de l’agence La Poste la plus proche de chez vous.</p>
                </div>
              </div>
            </label>
          </div>

          {isCustomOffice && (
            <div className="bg-[var(--paper)] p-4 rounded-lg border border-[var(--gold)] animate-in fade-in">
              <label className="block text-xs uppercase tracking-widest text-[var(--gold)] mb-2 font-semibold">Nom du bureau de poste</label>
              <input 
                type="text" 
                value={customOfficeInput}
                onChange={(e) => setCustomOfficeInput(e.target.value)}
                placeholder="Ex: Bureau de Poste de Linguère, Agence Keur Massar..."
                className="w-full border border-[var(--line)] bg-[var(--bg)] p-3 rounded-md text-sm"
              />
            </div>
          )}
        </div>
      )}

      <div className="pt-6">
        <button 
          type="button"
          onClick={handleNext}
          disabled={!isFormValid}
          className="button button-dark w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed text-sm py-4 px-8 flex items-center justify-center gap-2"
        >
          Continuer vers la vérification <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
