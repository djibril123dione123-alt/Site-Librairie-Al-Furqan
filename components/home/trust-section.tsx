import Link from 'next/link';
import { ArrowRight, MessageCircle, Truck } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';

/**
 * Final confidence beat — combines delivery facts and the WhatsApp
 * request fallback into one section instead of three separate generic
 * cards. Only factual, verified statements (no fixed fees/delays claimed).
 */
export function TrustSection() {
  return (
    <section className="home-band home-band-deep trust-band">
      <div className="trust-copy">
        <span className="eyebrow">SIMPLE ET HUMAIN</span>
        <h2>
          Vos livres, où que vous soyez
          <br />
          <em>au Sénégal.</em>
        </h2>
        <p>
          Les options disponibles dépendent de votre destination. La librairie confirme la disponibilité, le mode de
          livraison et le montant final lors de la commande.
        </p>
        <Link href="/livraison" className="text-link">
          Voir les informations de livraison <ArrowRight size={16} />
        </Link>
      </div>

      <div className="trust-facts">
        <span>
          <Truck size={18} /> Expédition depuis Saint-Louis
        </span>
        <span>
          <Truck size={18} /> Livraison via La Poste ou à une adresse
        </span>
        <span>
          <MessageCircle size={18} /> Confirmation finale via WhatsApp
        </span>
      </div>

      <div className="trust-whatsapp">
        <div>
          <span className="eyebrow">UNE RECHERCHE PARTICULIÈRE ?</span>
          <p>Vous ne trouvez pas un ouvrage dans le catalogue ? Envoyez directement votre demande à Al Furqan.</p>
        </div>
        <a
          className="button button-light"
          href={buildWhatsAppUrl('Assalāmu ʿalaykum,\nje recherche un ouvrage particulier. Pouvez-vous m’aider ?')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} /> Demander sur WhatsApp
        </a>
      </div>

      <Link href="/a-propos" className="trust-about-link">
        En savoir plus sur Al Furqan <ArrowRight size={14} />
      </Link>
    </section>
  );
}
