import Link from 'next/link';
import { ChevronDown, Truck, MessageCircle } from 'lucide-react';
import { siteConfig, buildWhatsAppUrl } from '@/lib/al-furqan-data';

export default function DeliveryPage() {
  return (
    <main className="info-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>Livraison</span>
      </div>
      <div className="info-hero">
        <span className="eyebrow">LIVRAISON</span>
        <h1>Vos livres, où que vous soyez au Sénégal.</h1>
        <p>
          Plusieurs solutions de livraison peuvent être proposées selon votre destination. Al Furqan vous confirme le mode disponible, le délai indicatif et le montant final sur WhatsApp.
        </p>
      </div>
      <div className="info-content">
        <section className="info-block">
          <h2>Destinations desservies</h2>
          <div className="delivery-destinations">
            <div>
              <strong>Saint-Louis</strong>
              <p>Remise possible en ville selon arrangement convenu sur WhatsApp.</p>
            </div>
            <div>
              <strong>Dakar</strong>
              <p>Envoi régulier vers la capitale et sa région.</p>
            </div>
            <div>
              <strong>Autres régions</strong>
              <p>Envoi partout au Sénégal, selon les transporteurs disponibles.</p>
            </div>
          </div>
        </section>
        <section className="info-block">
          <h2>Modes de livraison</h2>
          <div className="delivery-methods">
            {siteConfig.deliveryOptions.map((option) => (
              <div key={option.name}>
                <span>
                  <Truck size={18} /> {option.name}
                </span>
                <p>{option.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="info-block">
          <h2>Comment passer commande ?</h2>
          <ol className="delivery-steps">
            <li>Ajoutez les ouvrages souhaités à votre panier.</li>
            <li>Indiquez votre destination et votre mode de livraison préféré.</li>
            <li>Cliquez sur « Continuer sur WhatsApp » : votre message est déjà préparé.</li>
            <li>Al Furqan vous confirme la disponibilité et le montant final avec la livraison.</li>
          </ol>
        </section>
        <section className="info-block info-cta">
          <p>Une question sur la livraison ?</p>
          <a
            className="button button-dark"
            href={buildWhatsAppUrl('Assalāmu ʿalaykum, j’ai une question concernant la livraison.')}
          >
            <MessageCircle size={18} /> Poser une question sur WhatsApp
          </a>
        </section>
      </div>
    </main>
  );
}
