'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Building, Truck, ChevronRight } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

export type DeliveryMethod = 'standard' | 'la_poste';

export interface LocationData {
  region: string;
  locality: string;
}

export interface PostOffice {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface DeliveryFormProps {
  onValidSubmit: (data: { method: DeliveryMethod; location: LocationData; postOffice?: PostOffice }) => void;
}

// Fallback data if DB fails
const FALLBACK_REGIONS = ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Diourbel', 'Fatick'];
const FALLBACK_LOCALITIES: Record<string, string[]> = {
  'Dakar': ['Dakar Plateau', 'Ouakam', 'Ngor', 'Pikine', 'Rufisque'],
  'Thiès': ['Thiès', 'Tivaouane', 'Mbour'],
  'Saint-Louis': ['Saint-Louis', 'Richard-Toll']
};

// Simple Haversine distance
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

export function DeliveryForm({ onValidSubmit }: DeliveryFormProps) {
  const supabase = createBrowserClient();
  const [method, setMethod] = useState<DeliveryMethod | null>(null);
  
  // Locations
  const [regions, setRegions] = useState<string[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');
  
  // Post offices
  const [offices, setOffices] = useState<PostOffice[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<PostOffice | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Fetch initial regions (with fallback)
  useEffect(() => {
    async function fetchRegions() {
      try {
        const { data, error } = await supabase
          .from('senegal_locations')
          .select('region')
          .eq('is_active', true);
          
        if (error || !data || data.length === 0) throw new Error('No data');
        const uniqueRegions = Array.from(new Set(data.map(d => d.region))).sort();
        setRegions(uniqueRegions);
      } catch (err) {
        setRegions(FALLBACK_REGIONS);
      }
    }
    fetchRegions();
  }, [supabase]);

  // Fetch localities when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setLocalities([]);
      setSelectedLocality('');
      return;
    }
    async function fetchLocalities() {
      try {
        const { data, error } = await supabase
          .from('senegal_locations')
          .select('locality')
          .eq('region', selectedRegion)
          .eq('is_active', true);
          
        if (error || !data || data.length === 0) throw new Error('No data');
        const uniqueLocs = Array.from(new Set(data.map(d => d.locality))).sort();
        setLocalities(uniqueLocs);
      } catch (err) {
        setLocalities(FALLBACK_LOCALITIES[selectedRegion] || ['Ville non listée']);
      }
    }
    fetchLocalities();
  }, [selectedRegion, supabase]);

  // Fetch post offices when method=la_poste and region/locality selected
  useEffect(() => {
    if (method !== 'la_poste' || !selectedRegion || !selectedLocality) {
      setOffices([]);
      setSelectedOffice(null);
      return;
    }
    async function fetchOffices() {
      try {
        const { data, error } = await supabase
          .from('delivery_points')
          .select('*')
          .eq('provider', 'la_poste')
          .eq('region', selectedRegion)
          .eq('locality', selectedLocality)
          .eq('is_active', true);
          
        if (error) throw error;
        setOffices(data || []);
      } catch (err) {
        console.error('Failed to load post offices');
      }
    }
    fetchOffices();
  }, [method, selectedRegion, selectedLocality, supabase]);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (offices.length > 0) {
          // Sort offices by distance
          const sorted = [...offices].sort((a, b) => {
            const distA = getDistanceFromLatLonInKm(latitude, longitude, a.latitude, a.longitude);
            const distB = getDistanceFromLatLonInKm(latitude, longitude, b.latitude, b.longitude);
            return distA - distB;
          });
          setSelectedOffice(sorted[0]);
        }
      },
      () => {
        setLocating(false);
        setGeoError('Position refusée ou introuvable.');
      }
    );
  };

  const handleNext = () => {
    if (!method || !selectedRegion || !selectedLocality) return;
    if (method === 'la_poste' && !selectedOffice) return;
    
    onValidSubmit({
      method,
      location: { region: selectedRegion, locality: selectedLocality },
      postOffice: selectedOffice || undefined
    });
  };

  const isFormValid = method && selectedRegion && selectedLocality && (method !== 'la_poste' || selectedOffice);

  return (
    <div className="delivery-form-container">
      {/* 1. Mode de livraison */}
      <div className="step-block">
        <h3 className="serif text-xl font-medium mb-4">1. Choisissez votre mode de réception</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`delivery-method-card ${method === 'standard' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              name="method" 
              value="standard" 
              className="sr-only"
              checked={method === 'standard'}
              onChange={() => setMethod('standard')} 
            />
            <Truck size={24} className="mb-3 text-[#b28a52]" />
            <strong className="block serif text-lg mb-1">Livraison Classique</strong>
            <p className="text-xs text-[#64736f]">Livraison à domicile (Tiak Tiak / Rapide).</p>
          </label>
          
          <label className={`delivery-method-card ${method === 'la_poste' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              name="method" 
              value="la_poste" 
              className="sr-only"
              checked={method === 'la_poste'}
              onChange={() => setMethod('la_poste')} 
            />
            <Building size={24} className="mb-3 text-[#b28a52]" />
            <strong className="block serif text-lg mb-1">Retrait La Poste</strong>
            <p className="text-xs text-[#64736f]">Retirez votre colis dans un bureau de poste.</p>
          </label>
        </div>
      </div>

      {/* 2. Zone géographique */}
      {method && (
        <div className="step-block mt-8 border-t border-[#e3dcd1] pt-8 animate-in fade-in">
          <h3 className="serif text-xl font-medium mb-4">2. Votre localisation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="input-group">
              <label className="block text-xs uppercase tracking-widest text-[#b28a52] mb-2">Région</label>
              <select 
                value={selectedRegion} 
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full border border-[#e3dcd1] bg-[#fbf9f4] p-3 rounded-md"
              >
                <option value="">Sélectionner une région...</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="block text-xs uppercase tracking-widest text-[#b28a52] mb-2">Département / Commune</label>
              <select 
                value={selectedLocality} 
                onChange={(e) => setSelectedLocality(e.target.value)}
                disabled={!selectedRegion}
                className="w-full border border-[#e3dcd1] bg-[#fbf9f4] p-3 rounded-md disabled:opacity-50"
              >
                <option value="">Sélectionner...</option>
                {localities.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. Choix Bureau de Poste */}
      {method === 'la_poste' && selectedLocality && (
        <div className="step-block mt-8 border-t border-[#e3dcd1] pt-8 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="serif text-xl font-medium">3. Bureau de Poste</h3>
            <button 
              onClick={handleGeolocation} 
              disabled={locating || offices.length === 0}
              className="text-xs text-[#b28a52] flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <Navigation size={14} /> 
              {locating ? 'Recherche...' : 'Le plus proche'}
            </button>
          </div>
          
          {geoError && <p className="text-xs text-red-500 mb-3">{geoError}</p>}
          
          {offices.length === 0 ? (
            <p className="text-sm text-[#64736f] bg-[#f4ebd8] p-4 rounded-md">
              Aucun bureau de poste enregistré pour cette localité. Veuillez revenir en arrière ou choisir la livraison classique.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {offices.map(office => (
                <label 
                  key={office.id} 
                  className={`office-card p-4 border rounded-md cursor-pointer transition-colors ${
                    selectedOffice?.id === office.id 
                      ? 'border-[#b28a52] bg-[#f4ebd8]' 
                      : 'border-[#e3dcd1] hover:bg-[#fbf9f4]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      name="office" 
                      value={office.id}
                      checked={selectedOffice?.id === office.id}
                      onChange={() => setSelectedOffice(office)}
                      className="mt-1"
                    />
                    <div>
                      <strong className="block text-sm">{office.name}</strong>
                      <span className="text-xs text-[#64736f] flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {office.address}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Final */}
      <div className="mt-10">
        <button 
          onClick={handleNext}
          disabled={!isFormValid}
          className="button button-dark w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed text-sm py-4 px-8"
        >
          Valider ma livraison <ChevronRight size={18} />
        </button>
      </div>
      
      <style jsx>{`
        .delivery-method-card {
          border: 2px solid #e3dcd1;
          padding: 24px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fbf9f4;
        }
        .delivery-method-card:hover {
          border-color: #b28a52;
        }
        .delivery-method-card.selected {
          border-color: #b28a52;
          background: #f4ebd8;
        }
      `}</style>
    </div>
  );
}
