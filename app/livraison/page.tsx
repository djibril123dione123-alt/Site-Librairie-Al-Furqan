'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { formatPrice, generateOrderRef, buildWhatsAppUrl, getSiteUrl } from '@/lib/al-furqan-data';
import { useStore } from '@/components/providers';
import { useCustomerSession } from '@/components/auth/customer-session-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  fetchCustomerPreferences,
  resolveSavedPostOffice,
  saveDeliveryPreference,
  saveContactPreference,
} from '@/lib/supabase/customer';
import { DeliveryForm, DeliveryMethod, LocationData, PostOffice } from '@/components/delivery/delivery-form';
import { useCartRevalidation } from '@/components/cart/use-cart-revalidation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { AccountNudge } from '@/components/account/account-nudge';
import { LA_POSTE_SMALL_SHIPMENT_GUIDANCE } from '@/lib/delivery/postal-pricing';

type Step = 'delivery' | 'verification';

type DeliveryChoice = {
  method: DeliveryMethod;
  location: LocationData;
  postOffice?: PostOffice;
};

// A saved account preference may be missing a method (never explicitly
// chosen yet) — unlike DeliveryChoice, which only ever represents a fully
// completed, submitted form.
type PartialDeliveryChoice = {
  method?: DeliveryMethod;
  location: LocationData;
  postOffice?: PostOffice;
};

const DRAFT_KEY = 'af-delivery-draft';

// Pragmatic, non-strict validation — accepts common Senegal formats
// ("77 123 45 67", "+221 77 123 45 67", "221771234567") without an
// international phone library. Only rejects obviously empty/too-short input.
function isPlausiblePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return true;
  if (digits.length === 12 && digits.startsWith('221')) return true;
  return false;
}

export default function LivraisonPage() {
  const { loading, resolution } = useCartRevalidation();
  const lines = resolution.lines;

  const { user, isAuthenticated, authReady } = useCustomerSession();

  const [step, setStep] = useState<Step>('delivery');
  const [deliveryData, setDeliveryData] = useState<DeliveryChoice | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saveDestination, setSaveDestination] = useState(false);
  const [rememberContact, setRememberContact] = useState(false);
  const [contactPrefilled, setContactPrefilled] = useState(false);
  // Account preference save is secondary to the order itself (Phase J.1
  // §9/§10): a failure here must never lose the cart, alter the WhatsApp
  // payload, or block "Commander sur WhatsApp". A ref (not state) gates the
  // second click's behavior because it must be read synchronously in the
  // same call where it's set — a state update wouldn't be visible until
  // the next render, which is too late for a single click handler.
  const [preferenceSaveFailure, setPreferenceSaveFailure] = useState<{ destination: boolean; contact: boolean } | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const preferenceFailureAcknowledgedRef = useRef(false);

  const ref = useRef<string | null>(null);
  if (!ref.current && typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('af-order-ref');
    if (stored) {
      ref.current = stored;
    } else {
      const newRef = generateOrderRef();
      sessionStorage.setItem('af-order-ref', newRef);
      ref.current = newRef;
    }
  }

  // DeliveryForm seeds its internal state from `initialData` exactly once,
  // on mount — so the draft must be resolved BEFORE DeliveryForm mounts,
  // not handed to it via a prop update. Reading sessionStorage directly
  // during render would also read on the server (where it doesn't exist)
  // and again on client hydration, a classic hydration-mismatch source.
  // Instead: resolve the draft in an effect, keep DeliveryForm unmounted
  // until that lookup finishes, then mount it once with the final value.
  const [draftReady, setDraftReady] = useState(false);
  const [draftFromStorage, setDraftFromStorage] = useState<DeliveryChoice | undefined>(undefined);

  useEffect(() => {
    const stored = sessionStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        setDraftFromStorage(JSON.parse(stored));
      } catch {
        // Brouillon corrompu — ignoré silencieusement
      }
    }
    setDraftReady(true);
  }, []);

  // Same "resolve before mount" reasoning as the session draft above, one
  // tier lower in precedence: a saved account preference must never
  // overwrite a newer in-progress draft (Phase J §47). A saved post office
  // id is re-checked against the live table rather than trusted forever —
  // if it no longer exists, the geography still prefills but the office
  // does not, and the customer picks a new one (§48).
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceInitialData, setPreferenceInitialData] = useState<PartialDeliveryChoice | undefined>(undefined);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated || !user) {
      setPreferencesReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const prefs = await fetchCustomerPreferences(supabase, user.id);
      if (cancelled) return;

      if (prefs?.rememberContactDetails) {
        setRememberContact(true);
        if (prefs.contactName || prefs.contactPhone) {
          setContactPrefilled(true);
          if (prefs.contactName) setName(prefs.contactName);
          if (prefs.contactPhone) setPhone(prefs.contactPhone);
        }
      }

      if (prefs?.region) {
        let postOffice: PostOffice | undefined;
        if (prefs.preferredPostOfficeId) {
          const office = await resolveSavedPostOffice(supabase, prefs.preferredPostOfficeId);
          if (office) {
            postOffice = {
              id: office.id,
              name: office.name,
              address: office.address,
              region: office.region,
              locality: office.locality,
              latitude: office.latitude,
              longitude: office.longitude,
            };
          }
          // Office no longer exists: geography still prefills below, office
          // stays unset — the customer is asked to pick a new one, nothing
          // blocks the flow.
        } else if (prefs.preferredCustomOfficeName) {
          postOffice = {
            id: 'custom',
            name: prefs.preferredCustomOfficeName,
            address: null,
            region: prefs.region,
            locality: null,
            latitude: 0,
            longitude: 0,
            isCustomOffice: true,
          };
        }

        if (!cancelled) {
          setPreferenceInitialData({
            method: prefs.preferredDeliveryMethod || undefined,
            location: {
              region: prefs.region,
              department: prefs.department || undefined,
              commune: prefs.commune || undefined,
              locality: prefs.locality || '',
              localityId: prefs.localityId || undefined,
              isCustomLocality: prefs.isCustomLocality,
              quartier: prefs.quartier || undefined,
              repere: prefs.repere || undefined,
            },
            postOffice,
          });
        }
      }
      if (!cancelled) setPreferencesReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isAuthenticated, user?.id]);

  const validLines = lines.filter((l) => l.status === 'VALID');
  const invalidLines = lines.filter((l) => l.status !== 'VALID');
  const cartIsEmpty = !loading && lines.length === 0;
  const cartHasInvalidLines = !loading && lines.length > 0 && invalidLines.length > 0;

  const subtotal = validLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);
  const isPhoneValid = isPlausiblePhone(phone);

  const handleDeliverySubmit = (data: DeliveryChoice) => {
    setDeliveryData(data);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }
    setStep('verification');
  };

  // Returns true if there was nothing to save, or everything saved. False
  // means at least one explicitly-requested save failed — the caller must
  // not proceed to WhatsApp on this same attempt.
  const attemptPreferenceSaves = async (): Promise<boolean> => {
    if (!isAuthenticated || !user || !deliveryData) return true;
    if (!saveDestination && !rememberContact) return true;

    setSavingPreferences(true);
    const supabase = createBrowserClient();
    let destinationOk = true;
    let contactOk = true;

    if (saveDestination) {
      const isCustomOffice = deliveryData.postOffice?.isCustomOffice;
      destinationOk = await saveDeliveryPreference(supabase, user.id, {
        preferredDeliveryMethod: deliveryData.method,
        region: deliveryData.location.region,
        department: deliveryData.location.department || null,
        commune: deliveryData.location.commune || null,
        locality: deliveryData.location.locality,
        localityId: deliveryData.location.localityId || null,
        isCustomLocality: !!deliveryData.location.isCustomLocality,
        preferredPostOfficeId: deliveryData.postOffice && !isCustomOffice ? deliveryData.postOffice.id : null,
        preferredCustomOfficeName: isCustomOffice ? deliveryData.postOffice!.name : null,
      });
    }
    if (rememberContact) {
      contactOk = await saveContactPreference(supabase, user.id, {
        rememberContactDetails: true,
        contactName: name.trim(),
        contactPhone: phone.trim(),
        quartier: deliveryData.location.quartier || null,
        repere: deliveryData.location.repere || null,
      });
    }
    setSavingPreferences(false);

    if (!destinationOk || !contactOk) {
      setPreferenceSaveFailure({ destination: saveDestination && !destinationOk, contact: rememberContact && !contactOk });
      return false;
    }
    setPreferenceSaveFailure(null);
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!deliveryData || !name.trim() || !isPhoneValid || cartHasInvalidLines) return;

    // First attempt (or after "Réessayer"): try the save, and if it fails,
    // stay on this screen so the warning is visible — the order itself has
    // not been touched yet. Clicking "Commander sur WhatsApp" again (which
    // sets the ack ref first) means "continue anyway": the order flow must
    // never be gated on optional account convenience data.
    if (!preferenceFailureAcknowledgedRef.current) {
      const saved = await attemptPreferenceSaves();
      if (!saved) return;
    }
    preferenceFailureAcknowledgedRef.current = false;

    import('@/lib/data/analytics').then((m) => m.trackCatalogEvent('whatsapp_click'));

    const baseUrl = getSiteUrl();

    let deliveryText = '';
    if (deliveryData.method === 'la_poste') {
      deliveryText = `Mode : La Poste Sénégal\nRégion : ${deliveryData.location.region}${deliveryData.location.department ? `\nDépartement : ${deliveryData.location.department}` : ''}${deliveryData.location.commune ? `\nCommune : ${deliveryData.location.commune}` : ''}\nLocalité : ${deliveryData.location.locality}\nBureau retenu : ${deliveryData.postOffice?.name}`;
    } else {
      deliveryText = `Mode : Livraison à une adresse\nRégion : ${deliveryData.location.region}${deliveryData.location.department ? `\nDépartement : ${deliveryData.location.department}` : ''}${deliveryData.location.commune ? `\nCommune : ${deliveryData.location.commune}` : ''}\nLocalité : ${deliveryData.location.locality}\nQuartier / Rue : ${deliveryData.location.quartier || 'Non précisé'}${deliveryData.location.repere ? `\nRepère : ${deliveryData.location.repere}` : ''}`;
    }

    let postalText = '';
    if (deliveryData.method === 'la_poste') {
      postalText = `Frais La Poste :\nPrévoir généralement ${formatPrice(LA_POSTE_SMALL_SHIPMENT_GUIDANCE.minFcfa)} à ${formatPrice(LA_POSTE_SMALL_SHIPMENT_GUIDANCE.maxFcfa)} pour un ${LA_POSTE_SMALL_SHIPMENT_GUIDANCE.label}.\nÀ régler directement à La Poste lors du retrait.\nLe montant exact dépend du poids et de la destination.\nUne commande plus lourde peut coûter davantage.`;
    }

    const message = `Assalāmu ʿalaykum,
je souhaite finaliser ma commande Al Furqan.

*COMMANDE AL FURQAN*
${validLines
  .map(({ line, product, matchedVariant, unitPrice }) => {
    const lineTotal = unitPrice !== null ? unitPrice * line.quantity : 0;
    const skuVal = matchedVariant?.sku;
    const skuStr = skuVal ? ` (SKU: ${skuVal})` : '';
    const variantStr = matchedVariant && matchedVariant.attributes.length > 0
      ? `\n  ↳ ${matchedVariant.attributes.map((a) => `${a.label} : ${a.value}`).join(' · ')}${skuStr}`
      : '';
    const productUrl = `${baseUrl}/livres/${product!.slug}`;
    return `${line.quantity} × ${product!.title}${variantStr}\n  Prix : ${formatPrice(lineTotal)}\n  Lien : ${productUrl}`;
  })
  .join('\n\n')}

Montant des ouvrages : ${formatPrice(subtotal)}

*RÉCEPTION / LA POSTE*
${deliveryText}${postalText ? `\n${postalText}` : ''}

*COORDONNÉES CLIENT*
Nom : ${name.trim()}
Téléphone : ${phone.trim()}

Référence commande : ${ref.current}`;

    window.location.href = buildWhatsAppUrl(message);
  };

  return (
    <main className="delivery-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Panier', href: '/panier' }, { label: 'Livraison' }]} />

      <ol className="delivery-progress" aria-label="Étapes de la commande">
        <li className="is-done">1. Panier</li>
        <li className={step === 'delivery' ? 'is-current' : 'is-done'}>2. Livraison</li>
        <li className={step === 'verification' ? 'is-current' : ''}>3. Vérification</li>
      </ol>

      <div className="delivery-heading">
        {step === 'delivery' ? (
          <Link href="/panier" className="delivery-back-link">
            <ArrowLeft size={14} /> Retour au panier
          </Link>
        ) : (
          <button onClick={() => setStep('delivery')} className="delivery-back-link">
            <ArrowLeft size={14} /> Modifier la livraison
          </button>
        )}
        <h1 className="serif delivery-title">{step === 'delivery' ? 'Informations de livraison' : 'Vérification de la commande'}</h1>
        <p className="delivery-subtitle">
          {step === 'delivery'
            ? 'Veuillez indiquer vos préférences pour la réception de votre commande.'
            : 'Vérifiez vos informations avant de confirmer sur WhatsApp.'}
        </p>
        <p className="delivery-trust-note">Votre commande sera finalisée avec Al Furqan sur WhatsApp.</p>
      </div>

      <div className="delivery-content">
        {loading ? (
          <p className="delivery-loading">Vérification de votre panier...</p>
        ) : cartIsEmpty ? (
          <EmptyState title="Votre panier est vide" body="Ajoutez un ouvrage à votre panier avant de poursuivre vers la livraison.">
            <Link href="/catalogue" className="button button-dark">Explorer le catalogue</Link>
          </EmptyState>
        ) : cartHasInvalidLines ? (
          <div className="delivery-blocked-notice">
            <strong>Certains articles de votre panier ne sont plus valides.</strong>
            <p>Retournez au panier pour les corriger avant de poursuivre vers la livraison.</p>
            <Link href="/panier" className="button button-dark">Retourner au panier</Link>
          </div>
        ) : step === 'delivery' ? (
          !draftReady || !preferencesReady ? (
            <p className="delivery-loading">Chargement de vos préférences...</p>
          ) : (
            <DeliveryForm
              onValidSubmit={handleDeliverySubmit}
              initialData={deliveryData || draftFromStorage || preferenceInitialData}
            />
          )
        ) : (
          <div className="verification-step">
            <section className="review-section">
              <h3 className="review-section-title">Ouvrages</h3>
              <div className="review-line-list">
                {validLines.map(({ line, product, matchedVariant, unitPrice }, idx) => (
                  <div key={idx} className="review-line">
                    <div className="review-line-copy">
                      <span className="review-line-title">{line.quantity} × {product!.title}</span>
                      {matchedVariant && matchedVariant.attributes.length > 0 && (
                        <small>{matchedVariant.attributes.map((a) => `${a.label} : ${a.value}`).join(' · ')}</small>
                      )}
                    </div>
                    <strong>{unitPrice !== null ? formatPrice(unitPrice * line.quantity) : '—'}</strong>
                  </div>
                ))}
              </div>
              <div className="review-total-row">
                <span>Montant des ouvrages</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
            </section>

            <section className="review-section">
              <div className="review-section-header">
                <h3 className="review-section-title">Réception</h3>
                <button onClick={() => setStep('delivery')} className="review-edit-link">Modifier</button>
              </div>
              <div className="review-detail-list">
                {deliveryData?.method === 'la_poste' ? (
                  <>
                    <p><span>Mode</span> La Poste Sénégal</p>
                    <p><span>Bureau</span> {deliveryData.postOffice?.name}</p>
                    {deliveryData.postOffice?.address && <p><span>Adresse</span> {deliveryData.postOffice.address}</p>}
                  </>
                ) : (
                  <>
                    <p><span>Mode</span> Livraison à une adresse</p>
                    <p><span>Localité</span> {deliveryData?.location.locality} ({deliveryData?.location.region})</p>
                    <p><span>Quartier</span> {deliveryData?.location.quartier}</p>
                    {deliveryData?.location.repere && <p><span>Repère</span> {deliveryData.location.repere}</p>}
                  </>
                )}
              </div>
            </section>

            <AccountNudge
              title="Mémorisez cette destination"
              body="Retrouvez cette destination lors de votre prochaine commande."
              ctaLabel="Se connecter pour la mémoriser"
            />

            {isAuthenticated && (
              <label className="delivery-remember-row">
                <input
                  type="checkbox"
                  checked={saveDestination}
                  onChange={(e) => setSaveDestination(e.target.checked)}
                />
                Enregistrer cette destination pour la prochaine fois
              </label>
            )}

            {deliveryData?.method === 'la_poste' && (
              <section className="review-section">
                <h3 className="review-section-title">Frais postaux</h3>
                <p className="review-postal-range">
                  Pour un petit envoi : généralement <strong>{formatPrice(LA_POSTE_SMALL_SHIPMENT_GUIDANCE.minFcfa)}</strong> à <strong>{formatPrice(LA_POSTE_SMALL_SHIPMENT_GUIDANCE.maxFcfa)}</strong>
                </p>
                <p className="review-postal-note">À régler directement à La Poste lors du retrait.</p>
                <p className="review-postal-disclaimer">
                  Le montant exact dépend du poids et de la destination. Une commande plus lourde peut coûter davantage.
                </p>
              </section>
            )}

            <section className="review-section">
              <h3 className="review-section-title">Vos coordonnées</h3>
              {contactPrefilled && (
                <p className="delivery-hint">Coordonnées enregistrées sur votre compte — modifiables ci-dessous.</p>
              )}
              <div className="review-contact-grid">
                <div className="delivery-field">
                  <label className="delivery-field-label" htmlFor="customer-name">Prénom &amp; nom</label>
                  <input
                    id="customer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Oumar Ndiaye"
                    className="delivery-text-input"
                  />
                </div>
                <div className="delivery-field">
                  <label className="delivery-field-label" htmlFor="customer-phone">Téléphone</label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 77 123 45 67"
                    className="delivery-text-input"
                  />
                </div>
              </div>
              {isAuthenticated && (
                <label className="delivery-remember-row">
                  <input
                    type="checkbox"
                    checked={rememberContact}
                    onChange={(e) => setRememberContact(e.target.checked)}
                  />
                  Mémoriser mes coordonnées pour mes prochaines commandes
                </label>
              )}
            </section>

            {preferenceSaveFailure && (
              <div className="delivery-inline-note" role="status">
                <strong>Votre commande peut continuer normalement</strong>
                <p className="delivery-hint">
                  {preferenceSaveFailure.destination && preferenceSaveFailure.contact
                    ? "Nous n'avons pas pu enregistrer cette destination ni vos coordonnées sur votre compte pour la prochaine fois."
                    : preferenceSaveFailure.destination
                      ? "Nous n'avons pas pu enregistrer cette destination sur votre compte pour la prochaine fois."
                      : "Nous n'avons pas pu enregistrer vos coordonnées sur votre compte pour la prochaine fois."}
                </p>
                <div className="account-nudge-actions">
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      preferenceFailureAcknowledgedRef.current = false;
                      handleFinalSubmit();
                    }}
                    disabled={savingPreferences}
                  >
                    {savingPreferences ? 'Nouvel essai…' : "Réessayer l'enregistrement"}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (preferenceSaveFailure) preferenceFailureAcknowledgedRef.current = true;
                handleFinalSubmit();
              }}
              disabled={!name.trim() || !isPhoneValid || cartHasInvalidLines || savingPreferences}
              className="button button-dark delivery-whatsapp-button"
            >
              <MessageCircle size={18} /> Commander sur WhatsApp
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
