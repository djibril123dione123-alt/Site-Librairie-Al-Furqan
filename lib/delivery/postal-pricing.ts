/**
 * Guidance sur les frais La Poste Sénégal — V1 volontairement simplifiée
 * (F2.2).
 *
 * Décision business : ne plus calculer un tarif exact à partir du poids de
 * chaque produit. L'ancienne architecture (poids obligatoire par livre,
 * calcul de tranche tarifaire, statuts AVAILABLE/MISSING_PRODUCT_WEIGHT/...)
 * était trop lourde opérationnellement pour l'usage quotidien réel de la
 * librairie, et aucune grille tarifaire officielle vérifiée n'a de toute
 * façon pu être obtenue.
 *
 * À la place, le client reçoit une indication honnête de budget pour un
 * petit envoi. Ce n'est ni un tarif officiel garanti, ni un prix facturé
 * par Al Furqan : le montant exact reste fixé par La Poste et réglé
 * directement par le client au retrait du colis.
 *
 * products.weight_g reste en base comme métadonnée facultative pour un
 * usage logistique futur (voir Product.weightG dans lib/types/ui.ts) —
 * il n'est plus lu ni utilisé nulle part dans le tunnel de commande V1.
 * Une estimation exacte pourra être reconstruite plus tard si Al Furqan
 * obtient une grille tarifaire La Poste officielle et vérifiée.
 */
export const LA_POSTE_SMALL_SHIPMENT_GUIDANCE = {
  minFcfa: 1500,
  maxFcfa: 2000,
  label: 'petit envoi',
};

/** Lien vers le simulateur officiel, pour un client qui veut vérifier lui-même. */
export const LA_POSTE_SIMULATOR_URL = 'https://www.laposte.sn/simulateur-prix-envoi-colis-lettres/';
