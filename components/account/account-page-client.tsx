'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, LogOut } from 'lucide-react';
import { useStore } from '@/components/providers';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  fetchCustomerPreferences,
  clearDeliveryPreference,
  clearContactPreference,
  type CustomerPreferences,
} from '@/lib/supabase/customer';

const DELIVERY_METHOD_LABEL: Record<string, string> = {
  standard: 'Livraison à une adresse',
  la_poste: 'La Poste Sénégal',
};

export function AccountPageClient({ userId }: { userId: string }) {
  const { cartCount, wishlistCount } = useStore();
  const [preferences, setPreferences] = useState<CustomerPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserClient();
    fetchCustomerPreferences(supabase, userId).then((prefs) => {
      if (!cancelled) {
        setPreferences(prefs);
        setLoadingPrefs(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleClearDelivery = async () => {
    const supabase = createBrowserClient();
    const ok = await clearDeliveryPreference(supabase, userId);
    if (ok) {
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              preferredDeliveryMethod: null,
              region: null,
              department: null,
              commune: null,
              locality: null,
              localityId: null,
              isCustomLocality: false,
              preferredPostOfficeId: null,
              preferredCustomOfficeName: null,
            }
          : prev
      );
    }
  };

  const handleClearContact = async () => {
    const supabase = createBrowserClient();
    const ok = await clearContactPreference(supabase, userId);
    if (ok) {
      setPreferences((prev) =>
        prev ? { ...prev, rememberContactDetails: false, contactName: null, contactPhone: null } : prev
      );
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const hasDeliveryPreference = !!(preferences?.region);
  const hasContactPreference = !!(preferences?.rememberContactDetails && (preferences?.contactName || preferences?.contactPhone));

  return (
    <div className="account-sections">
      <section className="info-cta account-row">
        <div>
          <strong>Ma sélection</strong>
          <p>{wishlistCount} livre{wishlistCount !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/selection" className="button button-light">
          <Heart size={16} /> Voir ma sélection
        </Link>
      </section>

      <section className="info-cta account-row">
        <div>
          <strong>Mon panier</strong>
          <p>{cartCount} article{cartCount !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/panier" className="button button-light">
          <ShoppingBag size={16} /> Voir mon panier
        </Link>
      </section>

      <section className="info-cta account-row">
        <div>
          <strong>Livraison habituelle</strong>
          {loadingPrefs ? (
            <p>Chargement…</p>
          ) : hasDeliveryPreference ? (
            <p>
              {preferences?.preferredDeliveryMethod ? `${DELIVERY_METHOD_LABEL[preferences.preferredDeliveryMethod]} — ` : ''}
              {[preferences?.locality, preferences?.commune, preferences?.department, preferences?.region]
                .filter(Boolean)
                .slice(0, 2)
                .join(', ')}
              {preferences?.preferredCustomOfficeName ? ` (${preferences.preferredCustomOfficeName})` : ''}
            </p>
          ) : (
            <p>Non renseignée</p>
          )}
        </div>
        {hasDeliveryPreference && (
          <button type="button" className="text-link" onClick={handleClearDelivery}>
            Effacer
          </button>
        )}
      </section>

      <section className="info-cta account-row">
        <div>
          <strong>Coordonnées enregistrées</strong>
          {loadingPrefs ? (
            <p>Chargement…</p>
          ) : hasContactPreference ? (
            <p>
              {[preferences?.contactName, preferences?.contactPhone].filter(Boolean).join(' · ')}
            </p>
          ) : (
            <p>Non renseignées</p>
          )}
        </div>
        {hasContactPreference && (
          <button type="button" className="text-link" onClick={handleClearContact}>
            Effacer
          </button>
        )}
      </section>

      <section className="account-signout">
        <button type="button" className="button button-dark" onClick={handleSignOut} disabled={signingOut}>
          <LogOut size={16} /> {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </section>
    </div>
  );
}
