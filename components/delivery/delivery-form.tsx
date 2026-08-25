'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapPin, Navigation, Building, Truck, ChevronRight, ExternalLink } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { SearchableCombobox, ComboboxOption } from '@/components/ui/searchable-combobox';
import { formatPrice } from '@/lib/al-furqan-data';
import { LA_POSTE_SMALL_SHIPMENT_GUIDANCE, LA_POSTE_SIMULATOR_URL } from '@/lib/delivery/postal-pricing';
import { isValidUuid } from '@/lib/utils/uuid';

export type DeliveryMethod = 'standard' | 'la_poste';

export interface LocationData {
  region: string;
  department?: string;
  commune?: string;
  locality: string;
  quartier?: string;
  repere?: string;
  isCustomLocality?: boolean;
  // Real ANSD senegal_locations.id, when the selection came from the
  // search/combobox (never fabricated). Lets an account preference restore
  // the exact row later without re-searching by name — see identity note
  // at the selectedLocalityId/selectedLocalityLabel split below.
  localityId?: string;
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

// senegal_locations carries no coordinates at all (confirmed by direct
// audit — 0 of 25,240 rows), so "closest office to the selected locality"
// cannot be computed by distance; region is the strongest factual link
// delivery_points actually supports (department/commune are unpopulated
// there too). Accent/case fold so "Thiès" (ANSD) and "Thiès"/"THIES"
// (however an office row happens to store it) compare equal.
function normalizeRegionKey(region: string | null | undefined): string {
  if (!region) return '';
  return region.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

const FALLBACK_REGIONS = [
  'DAKAR', 'DIOURBEL', 'FATICK', 'KAFFRINE', 'KAOLACK', 'KEDOUGOU',
  'KOLDA', 'LOUGA', 'MATAM', 'SAINT-LOUIS', 'SEDHIOU', 'TAMBACOUNDA',
  'THIES', 'ZIGUINCHOR'
];

function PostalFeeGuidance() {
  const { minFcfa, maxFcfa } = LA_POSTE_SMALL_SHIPMENT_GUIDANCE;
  return (
    <div className="postal-fee-note">
      <p className="postal-fee-heading">Frais La Poste</p>
      <p className="postal-fee-range">
        Pour un petit envoi, prévoyez généralement entre <strong>{formatPrice(minFcfa)}</strong> et <strong>{formatPrice(maxFcfa)}</strong>.
      </p>
      <p className="postal-fee-note-line">À régler directement à La Poste lors du retrait.</p>
      <p className="postal-fee-disclaimer">
        Le montant exact dépend du poids et de la destination. Une commande plus lourde peut coûter davantage.{' '}
        <a href={LA_POSTE_SIMULATOR_URL} target="_blank" rel="noopener noreferrer">
          Simulateur officiel de La Poste <ExternalLink size={11} />
        </a>
      </p>
    </div>
  );
}

export function DeliveryForm({ onValidSubmit, initialData }: DeliveryFormProps) {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [method, setMethod] = useState<DeliveryMethod | null>(initialData?.method || null);

  // Server-driven geographic state
  const [regions, setRegions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);
  const [localitiesOptions, setLocalitiesOptions] = useState<ComboboxOption[]>([]);
  const [localitiesLoading, setLocalitiesLoading] = useState(false);
  // Full ANSD rows behind the current locality options — the combobox only
  // needs {value,label,sublabel}, but reverse-fill needs each row's real
  // region/department/commune, which ComboboxOption doesn't carry. Kept as
  // a parallel lookup rather than changing the shared combobox's option
  // shape (Phase H's identity architecture stays: value = real row id,
  // label = human name, never a composite).
  const [localitiesFullData, setLocalitiesFullData] = useState<
    { id: string; region: string; department: string | null; commune: string | null; locality: string }[]
  >([]);
  const [communeOptions, setCommuneOptions] = useState<ComboboxOption[]>([]);
  const [communeSearchLoading, setCommuneSearchLoading] = useState(false);
  const [communeSearchAvailable, setCommuneSearchAvailable] = useState(true);
  const [departmentOptions, setDepartmentOptions] = useState<ComboboxOption[]>([]);
  const [departmentSearchLoading, setDepartmentSearchLoading] = useState(false);
  const [departmentSearchAvailable, setDepartmentSearchAvailable] = useState(true);

  const [selectedRegion, setSelectedRegion] = useState(initialData?.location?.region || '');
  const [selectedDept, setSelectedDept] = useState(initialData?.location?.department || '');
  const [selectedCommune, setSelectedCommune] = useState(initialData?.location?.commune || '');
  // The combobox needs a genuinely unique `value` per option to key its list
  // and to know which row is selected. Real ANSD locality NAMES are not
  // unique (the same village/quartier name recurs in different communes),
  // so the option's `value` is the locality's real database id — never the
  // display name. `selectedLocalityLabel` is the actual human-readable name
  // and is the only one ever sent onward (LocationData.locality, WhatsApp).
  const [selectedLocalityId, setSelectedLocalityId] = useState(
    initialData?.location?.localityId || initialData?.location?.locality || ''
  );
  const [selectedLocalityLabel, setSelectedLocalityLabel] = useState(initialData?.location?.locality || '');

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
  // Mobile-only: once a bureau is picked, collapse the 129-row list behind
  // a compact "selected" summary instead of leaving it expanded under the
  // form. Desktop ignores this (see the media query) — an already-expanded
  // list with its own scroll reads fine there (Phase I §44).
  const [officeListCollapsed, setOfficeListCollapsed] = useState(false);
  const selectedOfficeRowRef = useRef<HTMLLabelElement>(null);

  // Phase J.3 §29: which signal is currently driving office relevance.
  // 'destination' (the default) ranks by the delivery address the customer
  // is actively filling in; 'device' is the explicit, temporary "use my
  // current position" action. They are never blended — switching to one
  // fully replaces the other's ordering, and a destination-field change
  // always snaps back to 'destination' (§30).
  const [officeRankingMode, setOfficeRankingMode] = useState<'destination' | 'device'>('destination');
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  // §25: region-matched offices are the default recommendation, not a dead
  // end — this reveals the rest of the catalogue on request.
  const [showAllRegions, setShowAllRegions] = useState(false);

  // Any destination-level change (§21/§30/§31) snaps ranking back to
  // 'destination' and drops the "show other regions" expansion — a fresh
  // destination deserves a fresh recommendation, not a stale GPS ordering
  // or a stale "see more" state left over from a previous one. A
  // previously-picked office that no longer matches the new destination's
  // region is cleared rather than silently kept (§30/§34) — a restored
  // saved preference's region+office pair still matches on mount, so this
  // never disturbs a legitimate restore.
  useEffect(() => {
    setOfficeRankingMode('destination');
    setShowAllRegions(false);
    setSelectedOffice((current) => {
      if (!current || current.isCustomOffice || !selectedRegion || !current.region) return current;
      return normalizeRegionKey(current.region) === normalizeRegionKey(selectedRegion) ? current : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedDept, selectedCommune, selectedLocalityId]);

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

  // 2. Fetch Departments via RPC. Region-scoped list once a region is
  // known, unchanged from before. Ref guard against out-of-order responses.
  const departmentsRequestId = useRef(0);
  useEffect(() => {
    if (!selectedRegion) {
      setDepartments([]);
      setSelectedDept('');
      return;
    }
    const requestId = ++departmentsRequestId.current;
    async function fetchDepts() {
      try {
        const { data, error } = await supabase.rpc('get_senegal_departments', { p_region: selectedRegion });
        if (requestId !== departmentsRequestId.current) return;
        if (!error && data) {
          setDepartments(data.map((d: any) => d.department).filter(Boolean));
        } else {
          setDepartments([]);
        }
      } catch (err) {
        if (requestId !== departmentsRequestId.current) return;
        setDepartments([]);
      }
    }
    fetchDepts();
  }, [selectedRegion, supabase]);

  // 2b. Global department search — for a customer who knows "Mbour" or
  // "Thiès" but not the region. Only usable while no region is selected yet.
  // Depends on search_senegal_departments (migration 011); degrades
  // silently to "unavailable" (the prior region-first behaviour) if that
  // RPC hasn't been deployed, exactly like the commune search below.
  const departmentSearchRequestId = useRef(0);
  const searchDepartmentsServer = useCallback(async (queryText: string) => {
    if (selectedRegion) return;
    const requestId = ++departmentSearchRequestId.current;
    setDepartmentSearchLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_senegal_departments', {
        p_query: queryText || null,
        p_region: null,
        p_limit: 50,
      });
      if (requestId !== departmentSearchRequestId.current) return;
      if (error) {
        setDepartmentSearchAvailable(false);
        setDepartmentOptions([]);
        return;
      }
      const opts: ComboboxOption[] = (data || []).map((item: any) => ({
        value: `${item.region}|||${item.department}`,
        label: item.department,
        sublabel: item.region || undefined,
      }));
      setDepartmentOptions(opts);
    } catch {
      if (requestId !== departmentSearchRequestId.current) return;
      setDepartmentSearchAvailable(false);
      setDepartmentOptions([]);
    } finally {
      if (requestId === departmentSearchRequestId.current) setDepartmentSearchLoading(false);
    }
  }, [selectedRegion, supabase]);

  useEffect(() => {
    if (!selectedRegion && departmentSearchAvailable) {
      searchDepartmentsServer('');
    }
  }, [selectedRegion, departmentSearchAvailable, searchDepartmentsServer]);

  // 3. Fetch Communes via RPC. When a region is already known, the
  // original region-scoped RPC is used directly (unchanged behaviour). Ref
  // guard against out-of-order responses (a slower earlier request must
  // never overwrite a newer one's result).
  const communesRequestId = useRef(0);
  useEffect(() => {
    if (!selectedRegion) {
      setCommunes([]);
      setSelectedCommune('');
      return;
    }
    const requestId = ++communesRequestId.current;
    async function fetchCommunes() {
      try {
        const { data, error } = await supabase.rpc('get_senegal_communes', {
          p_region: selectedRegion,
          p_department: selectedDept || null
        });
        if (requestId !== communesRequestId.current) return;
        if (!error && data) {
          setCommunes(data.map((c: any) => c.commune).filter(Boolean));
        } else {
          setCommunes([]);
        }
      } catch (err) {
        if (requestId !== communesRequestId.current) return;
        setCommunes([]);
      }
    }
    fetchCommunes();
  }, [selectedRegion, selectedDept, supabase]);

  // 3b. Global commune search — for a customer who knows "Ouakam" but not
  // its region, per Phase I. Only usable while no region is selected yet
  // (once one is, the region-scoped list above already covers it). Depends
  // on the search_senegal_communes RPC (migration 010); degrades silently
  // to "unavailable" if that RPC hasn't been deployed yet, so this is
  // additive — it can never break the existing region-first flow.
  const communeSearchRequestId = useRef(0);
  const searchCommunesServer = useCallback(async (queryText: string) => {
    if (selectedRegion) return;
    const requestId = ++communeSearchRequestId.current;
    setCommuneSearchLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_senegal_communes', {
        p_query: queryText || null,
        p_region: null,
        p_limit: 50,
      });
      if (requestId !== communeSearchRequestId.current) return;
      if (error) {
        setCommuneSearchAvailable(false);
        setCommuneOptions([]);
        return;
      }
      const opts: ComboboxOption[] = (data || []).map((item: any) => ({
        value: `${item.region}|||${item.department || ''}|||${item.commune}`,
        label: item.commune,
        sublabel: [item.department, item.region].filter(Boolean).join(' · '),
      }));
      setCommuneOptions(opts);
    } catch {
      if (requestId !== communeSearchRequestId.current) return;
      setCommuneSearchAvailable(false);
      setCommuneOptions([]);
    } finally {
      if (requestId === communeSearchRequestId.current) setCommuneSearchLoading(false);
    }
  }, [selectedRegion, supabase]);

  useEffect(() => {
    if (!selectedRegion && communeSearchAvailable) {
      searchCommunesServer('');
    }
  }, [selectedRegion, communeSearchAvailable, searchCommunesServer]);

  // 4. Server-side Locality Search via RPC — works with or without a
  // region/department/commune already chosen (the RPC's filters are all
  // optional), so a customer can search a village/quartier name directly.
  // Ref guard against out-of-order responses, same reasoning as communes.
  const localitiesRequestId = useRef(0);
  const searchLocalitiesServer = useCallback(async (queryText: string) => {
    const requestId = ++localitiesRequestId.current;
    setLocalitiesLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_senegal_localities', {
        p_region: selectedRegion || null,
        p_department: selectedDept || null,
        p_commune: selectedCommune || null,
        p_query: queryText || null,
        p_limit: 50
      });

      if (requestId !== localitiesRequestId.current) return;
      if (!error && data) {
        setLocalitiesFullData(data.map((item: any) => ({
          id: item.id,
          region: item.region,
          department: item.department,
          commune: item.commune,
          locality: item.locality,
        })));
        // item.id is the real senegal_locations row id (search_senegal_localities
        // RPC) — a stable unique identifier, not an invented one. The display
        // name (item.locality) is NOT unique across communes, so it must never
        // be used as the option's value/key.
        const opts: ComboboxOption[] = data.map((item: any) => ({
          value: item.id,
          label: item.locality,
          sublabel: [item.commune, item.department, item.region].filter(Boolean).join(' · ')
        }));
        setLocalitiesOptions(opts);
      }
    } catch (err) {
      console.error('Locality search error:', err);
    } finally {
      if (requestId === localitiesRequestId.current) setLocalitiesLoading(false);
    }
  }, [selectedRegion, selectedDept, selectedCommune, supabase]);

  useEffect(() => {
    // Always keep a live locality list — global when no ancestry is known
    // yet, scoped once it is. Never gated behind selectedRegion (Phase I):
    // a customer who knows the village name shouldn't have to pick a
    // region first.
    searchLocalitiesServer('');
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

  // "Use my current position" (§27): an explicit, temporary override of
  // ranking only. It never touches the delivery destination fields — that
  // stays exactly what the customer typed, which is why a gift sent from
  // Dakar to a Saint-Louis address keeps its Saint-Louis destination even
  // after this runs.
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
        setDeviceCoords({ lat: latitude, lng: longitude });
        setOfficeRankingMode('device');

        const validOffices = allOffices.filter(o => o.latitude !== null && o.longitude !== null);
        if (validOffices.length > 0) {
          const nearest = validOffices
            .map(o => ({
              ...o,
              distanceKm: getDistanceFromLatLonInKm(latitude, longitude, Number(o.latitude), Number(o.longitude))
            }))
            .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))[0];
          setSelectedOffice(nearest);
          setIsCustomOffice(false);
        }
      },
      () => {
        setLocating(false);
        setGeoError('Géolocalisation refusée. Veuillez choisir votre bureau ci-dessous.');
      }
    );
  };

  // §27: the explicit, clearly-labelled way back from device-based ranking
  // to the default destination-based recommendations. A GPS-selected office
  // from outside the destination's region would otherwise sit there marked
  // "selected" underneath a "recommended for <region>" heading it doesn't
  // belong to — the same staleness §30/§34 guard against on a destination
  // change applies here too, just triggered by the ranking-mode switch.
  const returnToDestinationRanking = () => {
    setOfficeRankingMode('destination');
    setDeviceCoords(null);
    setSelectedOffice((current) => {
      if (!current || current.isCustomOffice || !selectedRegion || !current.region) return current;
      return normalizeRegionKey(current.region) === normalizeRegionKey(selectedRegion) ? current : null;
    });
  };

  // Offices whose region matches the selected destination (§23/§24 — region
  // is the strongest factual relation the data supports; see the audit note
  // above normalizeRegionKey). Falls back to the full list rather than an
  // empty one so a destination in a region with no matching office is never
  // a dead end (§25).
  const regionMatchedOffices = useMemo(() => {
    if (!selectedRegion) return allOffices;
    const destKey = normalizeRegionKey(selectedRegion);
    const matched = allOffices.filter(o => normalizeRegionKey(o.region) === destKey);
    return matched.length > 0 ? matched : allOffices;
  }, [allOffices, selectedRegion]);

  const isRegionNarrowing = selectedRegion.length > 0 && regionMatchedOffices.length < allOffices.length;

  // Filtered/ranked offices for display. Search always runs over the full
  // catalogue (§37) so a genuine result is never hidden just because it
  // falls outside the recommended group — recommendation is a default
  // ordering, not a filter that can hide a real office.
  const displayedOffices = useMemo(() => {
    const isSearching = officeSearch.trim().length > 0;
    let list = officeRankingMode === 'device' || showAllRegions || isSearching || !selectedRegion
      ? allOffices
      : regionMatchedOffices;

    if (officeRankingMode === 'device' && deviceCoords) {
      list = list
        .map(o => (o.latitude !== null && o.longitude !== null)
          ? { ...o, distanceKm: getDistanceFromLatLonInKm(deviceCoords.lat, deviceCoords.lng, Number(o.latitude), Number(o.longitude)) }
          : o)
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }

    if (isSearching) {
      const q = officeSearch.toLowerCase();
      list = list.filter(o => o.name.toLowerCase().includes(q) || (o.address && o.address.toLowerCase().includes(q)));
    }

    return list;
  }, [allOffices, regionMatchedOffices, selectedRegion, officeSearch, officeRankingMode, deviceCoords, showAllRegions]);

  // §26: only claim the precision the data actually supports. We never have
  // real locality/commune coordinates (see the audit note above
  // normalizeRegionKey), so "près de <localité>" is never honest — the best
  // real claim is region-level, and device mode is its own distinct claim.
  const officeSectionHeading = officeRankingMode === 'device'
    ? 'Bureau de Poste — les plus proches de votre position'
    : selectedRegion
      ? `Bureau de Poste — recommandés pour la région de ${selectedRegion}`
      : `Bureau de Poste (${allOffices.length} points cartographiés)`;

  const officeSectionHint = officeRankingMode === 'device'
    ? 'Classés par distance depuis votre position actuelle. Ceci ne modifie pas votre adresse de livraison.'
    : selectedRegion
      ? 'Recommandation basée sur la région de livraison sélectionnée.'
      : 'Points de service officiellement cartographiés par La Poste Sénégal.';

  const finalLocality = selectedLocalityId === "Je ne trouve pas ma localité" ? customLocalityInput : selectedLocalityLabel;
  // Only a genuine ANSD row id (a real UUID picked from the search/combobox)
  // is ever forwarded — the legacy "label used as id" restore path and the
  // custom-locality sentinel must never be mistaken for one.
  const isRealLocalityId = isValidUuid(selectedLocalityId);

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
        isCustomLocality: selectedLocalityId === "Je ne trouve pas ma localité",
        localityId: isRealLocalityId ? selectedLocalityId : undefined
      },
      postOffice: method === 'la_poste' ? (
        isCustomOffice
          ? { id: 'custom', name: customOfficeInput, address: null, region: selectedRegion || null, locality: null, latitude: 0, longitude: 0, isCustomOffice: true }
          : selectedOffice!
      ) : undefined
    });
  };

  return (
    <div className="delivery-form-container">
      {/* 1. Mode de réception */}
      <div className="delivery-step">
        <h3 className="delivery-step-title">1. Mode de réception</h3>
        <div className="delivery-method-list" role="radiogroup" aria-label="Mode de réception">
          <label className={`delivery-method-row ${method === 'standard' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="method"
              value="standard"
              className="delivery-radio-input"
              checked={method === 'standard'}
              onChange={() => setMethod('standard')}
            />
            <Truck size={20} className="delivery-method-icon" aria-hidden="true" />
            <span className="delivery-method-copy">
              <strong>Livraison à une adresse</strong>
              <small>Livraison à domicile, bureau ou quartier au Sénégal.</small>
            </span>
          </label>

          <label className={`delivery-method-row ${method === 'la_poste' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="method"
              value="la_poste"
              className="delivery-radio-input"
              checked={method === 'la_poste'}
              onChange={() => setMethod('la_poste')}
            />
            <Building size={20} className="delivery-method-icon" aria-hidden="true" />
            <span className="delivery-method-copy">
              <strong>La Poste Sénégal</strong>
              <small>Retrait dans un bureau de poste cartographié.</small>
            </span>
          </label>
        </div>
      </div>

      {/* 2. Hiérarchie géographique */}
      {method && (
        <div className="delivery-step">
          <h3 className="delivery-step-title">2. Localisation (ANSD RGPH-5 2023)</h3>

          <div className="delivery-field-grid">
            {/* Région */}
            <div className="delivery-field">
              <label className="delivery-field-label">Région (14 régions du Sénégal)</label>
              <SearchableCombobox
                options={regions}
                value={selectedRegion}
                onChange={(val) => {
                  setSelectedRegion(val);
                  setSelectedDept('');
                  setSelectedCommune('');
                  setSelectedLocalityId('');
      setSelectedLocalityLabel('');
                }}
                placeholder="Sélectionner une région..."
                searchPlaceholder="Rechercher une région..."
              />
            </div>

            {/* Département — region-scoped list once a region is known; a
                global search (real ANSD ancestry) while it isn't, so
                "Mbour" or "Thiès" resolves its own Region without asking
                for it first. */}
            <div className="delivery-field">
              <label className="delivery-field-label">Département <span className="delivery-field-optional">facultatif</span></label>
              <SearchableCombobox
                options={selectedRegion ? departments : departmentOptions}
                value={selectedDept}
                disabled={selectedRegion ? departments.length === 0 : !departmentSearchAvailable}
                loading={!selectedRegion && departmentSearchLoading}
                onChange={(val) => {
                  if (selectedRegion) {
                    setSelectedDept(val);
                  } else {
                    // val is "region|||department" from the global search —
                    // the exact factual ancestry for that row.
                    const [region, department] = val.split('|||');
                    setSelectedRegion(region);
                    setSelectedDept(department);
                  }
                  setSelectedCommune('');
                  setSelectedLocalityId('');
                  setSelectedLocalityLabel('');
                }}
                onSearchChange={!selectedRegion ? (q) => searchDepartmentsServer(q) : undefined}
                placeholder={
                  selectedRegion
                    ? 'Sélectionner un département...'
                    : departmentSearchAvailable
                      ? 'Rechercher un département (ex : Mbour)...'
                      : "Choisissez une région d'abord"
                }
                searchPlaceholder="Rechercher un département..."
              />
            </div>

            {/* Commune — region-scoped list once a region is known; a global
                search (real ANSD ancestry, ids composited only as a UI key —
                see Phase I §34) while it isn't, so "Ouakam" resolves its own
                Region/Department without asking for them first. */}
            <div className="delivery-field">
              <label className="delivery-field-label">Commune / Arrondissement <span className="delivery-field-optional">facultatif</span></label>
              <SearchableCombobox
                options={selectedRegion ? communes : communeOptions}
                value={selectedCommune}
                disabled={selectedRegion ? communes.length === 0 : !communeSearchAvailable}
                loading={!selectedRegion && communeSearchLoading}
                onChange={(val) => {
                  if (selectedRegion) {
                    setSelectedCommune(val);
                  } else {
                    // val is "region|||department|||commune" from the global
                    // search — the exact factual ancestry for that row, never
                    // guessed. Reverse-fill Region/Department, then store the
                    // plain commune name (the field's real stored value).
                    const [region, department, commune] = val.split('|||');
                    setSelectedRegion(region);
                    setSelectedDept(department || '');
                    setSelectedCommune(commune);
                  }
                  setSelectedLocalityId('');
                  setSelectedLocalityLabel('');
                }}
                onSearchChange={!selectedRegion ? (q) => searchCommunesServer(q) : undefined}
                placeholder={
                  selectedRegion
                    ? 'Sélectionner une commune...'
                    : communeSearchAvailable
                      ? 'Rechercher une commune (ex : Ouakam)...'
                      : "Choisissez une région d'abord"
                }
                searchPlaceholder="Rechercher une commune..."
              />
            </div>

            {/* Localité / Quartier (Serveur Search Engine) — never gated
                behind a region: a customer who knows the village name can
                search it directly, and the exact selected row's real
                ancestry reverse-fills Region/Department/Commune. */}
            <div className="delivery-field">
              <label className="delivery-field-label">Localité / Quartier / Village</label>
              <SearchableCombobox
                options={localitiesOptions}
                value={selectedLocalityId}
                loading={localitiesLoading}
                onChange={(val) => {
                  setSelectedLocalityId(val);
                  if (val === "Je ne trouve pas ma localité") {
                    setSelectedLocalityLabel('');
                  } else {
                    const match = localitiesFullData.find((o) => o.id === val);
                    if (match) {
                      setSelectedLocalityLabel(match.locality);
                      if (match.region) setSelectedRegion(match.region);
                      if (match.department) setSelectedDept(match.department);
                      if (match.commune) setSelectedCommune(match.commune);
                    } else {
                      const fallback = localitiesOptions.find((o) => o.value === val);
                      setSelectedLocalityLabel(fallback ? fallback.label : val);
                    }
                  }
                }}
                onSearchChange={(q) => searchLocalitiesServer(q)}
                placeholder="Rechercher une localité, un village, un quartier..."
                searchPlaceholder="Tapez un nom de village, quartier..."
                customFallbackOption="Je ne trouve pas ma localité"
              />
            </div>
          </div>

          {/* Fallback Saisie Manuelle Localité */}
          {selectedLocalityId === "Je ne trouve pas ma localité" && (
            <div className="delivery-inline-note">
              <label className="delivery-field-label">Saisissez le nom de votre localité</label>
              <input
                type="text"
                value={customLocalityInput}
                onChange={(e) => setCustomLocalityInput(e.target.value)}
                placeholder="Ex: Touba Mosquée, Village de Ndiemane..."
                className="delivery-text-input"
              />
              <p className="delivery-hint">Cette précision sera transmise directement avec votre commande WhatsApp.</p>
            </div>
          )}

          {/* Champs Adresse Supplémentaires */}
          {method === 'standard' && selectedLocalityId && (
            <div className="delivery-field-grid delivery-field-grid-tight">
              <div className="delivery-field">
                <label className="delivery-field-label">Quartier / Rue (requis)</label>
                <input
                  type="text"
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  placeholder="Ex: Sicap Liberté 5, Rue 10"
                  className="delivery-text-input"
                />
              </div>
              <div className="delivery-field">
                <label className="delivery-field-label">Repère / Précision <span className="delivery-field-optional">facultatif</span></label>
                <input
                  type="text"
                  value={repere}
                  onChange={(e) => setRepere(e.target.value)}
                  placeholder="Ex: Près de la mosquée, Villa 102..."
                  className="delivery-text-input"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Sélection Bureau La Poste */}
      {method === 'la_poste' && (
        <div className="delivery-step">
          <div className="delivery-office-header">
            <div>
              <h3 className="delivery-step-title">3. {officeSectionHeading}</h3>
              <p className="delivery-hint">{officeSectionHint}</p>
            </div>

            <div className="delivery-office-actions">
              <button
                type="button"
                onClick={handleGeolocation}
                disabled={locating}
                className="delivery-geo-button"
              >
                <Navigation size={14} />
                {locating ? 'Géolocalisation...' : 'Utiliser ma position actuelle'}
              </button>

              <a
                href="https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT"
                target="_blank"
                rel="noopener noreferrer"
                className="delivery-map-link"
              >
                Carte officielle <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <p className="delivery-hint">Utiliser ma position actuelle change uniquement le classement des bureaux ci-dessous — elle ne remplace jamais l&apos;adresse de livraison.</p>
          {geoError && <p className="delivery-error-text">{geoError}</p>}

          {officeRankingMode === 'device' && (
            <button
              type="button"
              className="delivery-office-mode-return"
              onClick={returnToDestinationRanking}
            >
              ← Revenir aux bureaux recommandés pour ma destination
            </button>
          )}

          <input
            type="text"
            value={officeSearch}
            onChange={(e) => setOfficeSearch(e.target.value)}
            placeholder="Filtrer les bureaux de poste par nom..."
            className="delivery-text-input delivery-office-search"
          />

          {officeRankingMode !== 'device' && isRegionNarrowing && !officeSearch.trim() && (
            <button
              type="button"
              className="delivery-office-region-toggle"
              onClick={() => setShowAllRegions((v) => !v)}
            >
              {showAllRegions
                ? 'Afficher seulement les bureaux recommandés'
                : 'Voir les bureaux des autres régions'}
            </button>
          )}

          {/* Outside the scrolling list on every viewport. On mobile it also
              replaces the list once a real office is picked, so the customer
              isn't left scrolling past 128 more rows to reach Continue. */}
          {selectedOffice && !isCustomOffice && (
            <div className="delivery-office-summary">
              <div>
                <span className="delivery-office-summary-label">Bureau sélectionné</span>
                <strong>{selectedOffice.name}</strong>
                {selectedOffice.address && <span className="delivery-office-address">{selectedOffice.address}</span>}
              </div>
              <button
                type="button"
                className="delivery-office-summary-change"
                onClick={() => {
                  setOfficeListCollapsed(false);
                  requestAnimationFrame(() => {
                    selectedOfficeRowRef.current?.scrollIntoView({ block: 'center' });
                  });
                }}
              >
                Changer
              </button>
            </div>
          )}

          <div
            className={`delivery-office-list ${officeListCollapsed && selectedOffice && !isCustomOffice ? 'is-collapsed' : ''}`}
            role="radiogroup"
            aria-label="Bureau de poste"
          >
            {displayedOffices.map(office => (
              <label
                key={office.id}
                ref={selectedOffice?.id === office.id ? selectedOfficeRowRef : undefined}
                className={`delivery-office-row ${!isCustomOffice && selectedOffice?.id === office.id ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="office"
                  value={office.id}
                  checked={!isCustomOffice && selectedOffice?.id === office.id}
                  onChange={() => {
                    setSelectedOffice(office);
                    setIsCustomOffice(false);
                    setOfficeListCollapsed(true);
                  }}
                  className="delivery-radio-input"
                />
                <span className="delivery-office-copy">
                  <span className="delivery-office-name-row">
                    <strong>{office.name}</strong>
                    {office.region && <span className="delivery-office-region">{office.region}</span>}
                  </span>
                  {office.address && (
                    <span className="delivery-office-address">
                      <MapPin size={12} aria-hidden="true" /> {office.address}
                    </span>
                  )}
                </span>
                {office.distanceKm !== undefined && (
                  <span className="delivery-office-distance">≈ {office.distanceKm.toFixed(1)} km</span>
                )}
              </label>
            ))}

            {/* Saisie Manuelle Bureau Si non trouvé */}
            <label className={`delivery-office-row ${isCustomOffice ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="office"
                value="custom"
                checked={isCustomOffice}
                onChange={() => {
                  setIsCustomOffice(true);
                  setSelectedOffice(null);
                }}
                className="delivery-radio-input"
              />
              <span className="delivery-office-copy">
                <strong className="delivery-office-custom-label">+ Je ne trouve pas mon bureau (saisie manuelle)</strong>
                <span className="delivery-office-address">Indiquez le nom de l&apos;agence La Poste la plus proche de chez vous.</span>
              </span>
            </label>
          </div>

          {isCustomOffice && (
            <div className="delivery-inline-note">
              <label className="delivery-field-label">Nom du bureau de poste</label>
              <input
                type="text"
                value={customOfficeInput}
                onChange={(e) => setCustomOfficeInput(e.target.value)}
                placeholder="Ex: Bureau de Poste de Linguère, Agence Keur Massar..."
                className="delivery-text-input"
              />
            </div>
          )}

          <PostalFeeGuidance />
        </div>
      )}

      <div className="delivery-submit-row">
        <button
          type="button"
          onClick={handleNext}
          disabled={!isFormValid}
          className="button button-dark delivery-submit-button"
        >
          Continuer vers la vérification <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
