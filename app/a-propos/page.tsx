import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/al-furqan-data';

export default function AboutPage() {
  return (
    <main className="info-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>À propos</span>
      </div>
      <div className="info-hero">
        <span className="eyebrow">À PROPOS</span>
        <h1>Une librairie dédiée au savoir et à la transmission.</h1>
      </div>
      <div className="info-content">
        <section className="info-block">
          <p>
            Librairie Al Furqan propose à Saint-Louis une sélection de Corans et d’ouvrages islamiques couvrant notamment le Tafsir, la croyance, les invocations, l’éducation, la langue arabe et la jeunesse.
          </p>
        </section>
        <section className="info-block">
          <h2>Commander en toute simplicité</h2>
          <p>
            Vous parcourez le catalogue en ligne, vous ajoutez vos ouvrages au panier, puis la commande se finalise
            naturellement sur WhatsApp. La livraison est disponible au Sénégal.
          </p>
        </section>
        <section className="info-block info-cta">
          <p>Une question, une recherche particulière ?</p>
          <a
            className="button button-dark"
            href={buildWhatsAppUrl('Assalāmu ʿalaykum, j’aimerais en savoir plus sur la librairie Al Furqan.')}
          >
            <MessageCircle size={18} /> Écrire sur WhatsApp
          </a>
        </section>
      </div>
    </main>
  );
}
