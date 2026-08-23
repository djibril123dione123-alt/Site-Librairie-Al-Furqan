'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { formatPrice, generateOrderRef, buildWhatsAppUrl, getSiteUrl } from '@/lib/al-furqan-data';
import { useStore } from '@/components/providers';
import { DeliveryForm, DeliveryMethod, LocationData, PostOffice } from '@/components/delivery/delivery-form';
import { useCartRevalidation } from '@/components/cart/use-cart-revalidation';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { calculateCartWeight, estimatePostalFee, selectPostalService, LA_POSTE_SIMULATOR_URL } from '@/lib/delivery/postal-pricing';

type Step = 'delivery' | 'verification';

type DeliveryChoice = {
  method: DeliveryMethod;
  location: LocationData;
  postOffice?: PostOffice;
};

const DRAFT_KEY = 'af-delivery-draft';

export default function LivraisonPage() {
  const { loading, resolution } = useCartRevalidation();
  const lines = resolution.lines;

  const [step, setStep] = useState<Step>('delivery');
  const [deliveryData, setDeliveryData] = useState<DeliveryChoice | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

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

  const validLines = lines.filter((l) => l.status === 'VALID');
  const invalidLines = lines.filter((l) => l.status !== 'VALID');
  const cartIsEmpty = !loading && lines.length === 0;
  const cartHasInvalidLines = !loading && lines.length > 0 && invalidLines.length > 0;

  const subtotal = validLines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);

  const cartWeight = calculateCartWeight(
    validLines.map((l) => ({ weightG: l.product?.weightG ?? null, quantity: l.line.quantity }))
  );

  const postalEstimate = deliveryData?.method === 'la_poste'
    ? estimatePostalFee({ weightG: cartWeight.totalWeightG, service: selectPostalService(cartWeight.totalWeightG) })
    : null;

  const estimatedBudgetTotal = postalEstimate?.status === 'AVAILABLE' && postalEstimate.estimatedFeeFcfa !== null
    ? subtotal + postalEstimate.estimatedFeeFcfa
    : null;

  const handleDeliverySubmit = (data: DeliveryChoice) => {
    setDeliveryData(data);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }
    setStep('verification');
  };

  const handleFinalSubmit = () => {
    if (!deliveryData || !name || !phone || cartHasInvalidLines) return;

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
      if (postalEstimate?.status === 'AVAILABLE' && postalEstimate.estimatedFeeFcfa !== null) {
        postalText = `Frais La Poste estimés : ≈ ${formatPrice(postalEstimate.estimatedFeeFcfa)} (à régler directement à La Poste au retrait)`;
        if (estimatedBudgetTotal !== null) {
          postalText += `\nBudget total estimatif (indicatif) : ≈ ${formatPrice(estimatedBudgetTotal)}`;
        }
      } else {
        postalText = 'Frais La Poste : tarif non estimé en ligne — à régler directement à La Poste au retrait.';
      }
    }

    const message = `Assalāmu ʿalaykum,
je souhaite finaliser ma commande Al Furqan.

*COMMANDE AL FURQAN*
${validLines
  .map(({ line, product, matchedVariant, unitPrice }, index) => {
    const lineTotal = unitPrice !== null ? unitPrice * line.quantity : 0;
    const skuVal = matchedVariant?.sku;
    const skuStr = skuVal ? ` (SKU: ${skuVal})` : '';
    const variantStr = matchedVariant && matchedVariant.attributes.length > 0
      ? `\n  ↳ ${matchedVariant.attributes.map((a) => `${a.label} : ${a.value}`).join(' · ')}${skuStr}`
      : '';
    const productUrl = `${baseUrl}/livres/${product!.slug}`;
    return `${index + 1} × ${product!.title}${variantStr}\n  Prix : ${formatPrice(lineTotal)}\n  Lien : ${productUrl}`;
  })
  .join('\n\n')}

Montant des ouvrages : ${formatPrice(subtotal)}

*LIVRAISON / LA POSTE*
${deliveryText}${postalText ? `\n${postalText}` : ''}

*COORDONNÉES CLIENT*
Nom : ${name}
Téléphone : ${phone}

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
          !draftReady ? (
            <p className="delivery-loading">Chargement de vos préférences...</p>
          ) : (
            <DeliveryForm
              onValidSubmit={handleDeliverySubmit}
              initialData={deliveryData || draftFromStorage}
              cartWeightG={cartWeight.totalWeightG}
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

            {deliveryData?.method === 'la_poste' && (
              <section className="review-section">
                <h3 className="review-section-title">Frais postaux</h3>
                {postalEstimate?.status === 'AVAILABLE' && postalEstimate.estimatedFeeFcfa !== null ? (
                  <>
                    {cartWeight.totalWeightG !== null && (
                      <p className="review-postal-basis">Poids estimé : {(cartWeight.totalWeightG / 1000).toFixed(2).replace('.', ',')} kg</p>
                    )}
                    <div className="review-total-row">
                      <span>Frais La Poste estimés</span>
                      <strong>≈ {formatPrice(postalEstimate.estimatedFeeFcfa)}</strong>
                    </div>
                    <p className="review-postal-note">À régler directement à La Poste au retrait.</p>
                  </>
                ) : (
                  <p className="review-postal-note">
                    Frais La Poste — Tarif non estimé en ligne. Le montant sera appliqué directement par La Poste lors du retrait.{' '}
                    <a href={LA_POSTE_SIMULATOR_URL} target="_blank" rel="noopener noreferrer">
                      Simulateur officiel <ExternalLink size={11} />
                    </a>
                  </p>
                )}
              </section>
            )}

            {estimatedBudgetTotal !== null && (
              <section className="review-section review-section-budget">
                <h3 className="review-section-title">Budget indicatif</h3>
                <div className="review-total-row">
                  <span>Ouvrages + estimation La Poste</span>
                  <strong>Budget total estimatif ≈ {formatPrice(estimatedBudgetTotal)}</strong>
                </div>
              </section>
            )}

            <section className="review-section">
              <h3 className="review-section-title">Vos coordonnées</h3>
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
            </section>

            <button
              onClick={handleFinalSubmit}
              disabled={!name || !phone || cartHasInvalidLines}
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
