import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, MessageCircle, MapPin, ArrowRight } from 'lucide-react';
import { siteConfig, buildWhatsAppUrl } from '@/lib/al-furqan-data';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contacter Al Furqan sur WhatsApp, TikTok ou Facebook Marketplace — librairie islamique à Saint-Louis, Sénégal.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <main className="info-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>Contact</span>
      </div>
      <div className="info-hero">
        <span className="eyebrow">CONTACT</span>
        <h1>Contacter Al Furqan.</h1>
        <p>Pour une commande, une recherche d’ouvrage ou une question, le plus simple est de passer par WhatsApp.</p>
      </div>
      <div className="info-content">
        <section className="info-block contact-grid">
          <div>
            <strong>WhatsApp</strong>
            <p>{siteConfig.phoneDisplay}</p>
            <a
              className="button button-dark"
              href={buildWhatsAppUrl('Assalāmu ʿalaykum, je souhaite vous contacter.')}
            >
              <MessageCircle size={18} /> Ouvrir WhatsApp
            </a>
          </div>
          <div>
            <strong>TikTok</strong>
            <p>@alfurqan.librairie</p>
            <a className="text-link" href={siteConfig.tiktok} target="_blank" rel="noopener noreferrer">
              Voir TikTok <ArrowRight size={16} />
            </a>
          </div>
          <div>
            <strong>Facebook Marketplace</strong>
            <p>Al Furqan</p>
            <a className="text-link" href={siteConfig.facebook} target="_blank" rel="noopener noreferrer">
              Voir Facebook <ArrowRight size={16} />
            </a>
          </div>
          <div>
            <strong>Localisation</strong>
            <p>
              <MapPin size={16} /> {siteConfig.location}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
