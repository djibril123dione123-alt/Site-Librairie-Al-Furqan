/**
 * Moteur d'estimation des frais La Poste Sénégal.
 *
 * Règle absolue : ces frais ne sont JAMAIS un revenu Al Furqan. Ce module ne fait
 * qu'estimer, à titre informatif, ce que La Poste facturera au client lors du
 * retrait du colis. Aucun prix n'est inventé : si le tarif officiel n'est pas
 * disponible ici, la fonction retourne RATE_UNAVAILABLE plutôt qu'un chiffre
 * approximatif ("une estimation manquante vaut mieux qu'un prix faux").
 *
 * Statut des données tarifaires (2026-08-23) : le simulateur officiel La Poste
 * Sénégal est un calculateur JavaScript côté client, sans grille tarifaire
 * statique extractible. Aucune grille FCFA vérifiable n'a donc pu être importée
 * pour le moment — TARIFF_TABLE est intentionnellement vide. Quand une grille
 * officielle sera obtenue (document PDF/tarif affiché en bureau de poste), elle
 * doit être ajoutée ici avec sa source exacte, sa date de vérification, son
 * service et sa tranche de poids — jamais depuis un souvenir ou un blog tiers.
 */

export type PostalService = 'colis_national';

export type PostalEstimateStatus =
  | 'AVAILABLE'
  | 'MISSING_PRODUCT_WEIGHT'
  | 'OUTSIDE_SUPPORTED_WEIGHT'
  | 'RATE_UNAVAILABLE'
  | 'UNSUPPORTED_SERVICE';

export interface PostalEstimateInput {
  /** Poids total estimé du colis en grammes, ou null si incomplet/inconnu. */
  weightG: number | null;
  service: PostalService;
}

export interface PostalEstimateResult {
  status: PostalEstimateStatus;
  estimatedFeeFcfa: number | null;
  service: PostalService;
  /** Nom/référence de la source officielle La Poste ayant fourni ce tarif. */
  source: string | null;
  /** Date de vérification de la source, au format ISO. */
  verifiedAt: string | null;
  weightBracketLabel?: string;
}

interface TariffEntry {
  service: PostalService;
  minWeightG: number;
  maxWeightG: number;
  feeFcfa: number;
  source: string;
  verifiedAt: string;
}

/**
 * Grille tarifaire vérifiée, importée UNIQUEMENT depuis une source officielle
 * La Poste Sénégal (document tarifaire, affichage en bureau, simulateur avec
 * grille statique consultable). Vide tant qu'aucune source fiable n'a été
 * obtenue — voir note en tête de fichier.
 */
const TARIFF_TABLE: TariffEntry[] = [];

/**
 * Allocation de poids d'emballage (grammes), appliquée une fois par commande.
 * Valeur d'ingénierie interne d'Al Furqan (protection/calage du colis) — ce
 * n'est PAS une règle tarifaire La Poste.
 */
export const PACKAGING_WEIGHT_G = 100;

export function calculatePackagingWeightG(bookLineCount: number): number {
  return bookLineCount > 0 ? PACKAGING_WEIGHT_G : 0;
}

export interface CartWeightLine {
  weightG: number | null | undefined;
  quantity: number;
}

export interface CartWeightResult {
  /** Poids total (ouvrages + emballage), ou null si un poids produit manque. */
  totalWeightG: number | null;
  booksWeightG: number;
  packagingWeightG: number;
  missingWeightLineCount: number;
}

/**
 * Calcule le poids postal estimé d'un panier à partir des lignes résolues.
 * Si un seul produit valide n'a pas de poids renseigné, le poids total est
 * incomplet (null) — jamais calculé silencieusement à partir des seuls
 * ouvrages connus.
 */
export function calculateCartWeight(lines: CartWeightLine[]): CartWeightResult {
  let booksWeightG = 0;
  let missingWeightLineCount = 0;

  for (const line of lines) {
    if (line.weightG === null || line.weightG === undefined) {
      missingWeightLineCount += 1;
      continue;
    }
    booksWeightG += line.weightG * line.quantity;
  }

  const packagingWeightG = calculatePackagingWeightG(lines.length);

  if (missingWeightLineCount > 0) {
    return { totalWeightG: null, booksWeightG, packagingWeightG, missingWeightLineCount };
  }

  return {
    totalWeightG: booksWeightG + packagingWeightG,
    booksWeightG,
    packagingWeightG,
    missingWeightLineCount: 0,
  };
}

const SUPPORTED_SERVICES: PostalService[] = ['colis_national'];

/**
 * Estime les frais La Poste pour un poids et un service donnés. Ne fait aucun
 * appel réseau : la donnée tarifaire est un config versionné en dur ci-dessus.
 */
export function estimatePostalFee(input: PostalEstimateInput): PostalEstimateResult {
  const { weightG, service } = input;

  if (!SUPPORTED_SERVICES.includes(service)) {
    return { status: 'UNSUPPORTED_SERVICE', estimatedFeeFcfa: null, service, source: null, verifiedAt: null };
  }

  if (weightG === null) {
    return { status: 'MISSING_PRODUCT_WEIGHT', estimatedFeeFcfa: null, service, source: null, verifiedAt: null };
  }

  const matching = TARIFF_TABLE.filter((t) => t.service === service);
  if (matching.length === 0) {
    return { status: 'RATE_UNAVAILABLE', estimatedFeeFcfa: null, service, source: null, verifiedAt: null };
  }

  const bracket = matching.find((t) => weightG >= t.minWeightG && weightG <= t.maxWeightG);
  if (!bracket) {
    return { status: 'OUTSIDE_SUPPORTED_WEIGHT', estimatedFeeFcfa: null, service, source: null, verifiedAt: null };
  }

  return {
    status: 'AVAILABLE',
    estimatedFeeFcfa: bracket.feeFcfa,
    service,
    source: bracket.source,
    verifiedAt: bracket.verifiedAt,
    weightBracketLabel: `${bracket.minWeightG}–${bracket.maxWeightG} g`,
  };
}

/** Lien vers le simulateur officiel, affiché quand aucune estimation interne n'existe. */
export const LA_POSTE_SIMULATOR_URL = 'https://www.laposte.sn';
