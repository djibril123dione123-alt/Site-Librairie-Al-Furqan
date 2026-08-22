import { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, ArrowRight, Truck } from 'lucide-react';
import { buildWhatsAppUrl, siteConfig } from '@/lib/al-furqan-data';
import { getCategories } from '@/lib/data/categories';
import { EditorialBreadcrumb } from '@/components/editorial/breadcrumb';

export const metadata: Metadata = {
  title: 'À propos',
  description: 'Librairie islamique à Saint-Louis, Sénégal — catalogue, fonctionnement de la commande et livraison.',
  alternates: { canonical: '/a-propos' },
};

const steps = [
  { n: '01', title: 'Parcourez les ouvrages', body: 'Explorez le catalogue en ligne par catégorie, auteur ou éditeur.' },
  { n: '02', title: 'Indiquez votre livraison', body: 'Choisissez votre destination et votre mode de livraison (La Poste ou à une adresse).' },
  { n: '03', title: 'Finalisez sur WhatsApp', body: 'La librairie confirme la disponibilité et le montant final, puis la commande se conclut sur WhatsApp.' },
];

export default async function AboutPage() {
  const categories = await getCategories();

  return (
    <main className="about-page">
      <EditorialBreadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'À propos' }]} />

      <section className="about-hero">
        <span className="eyebrow">Librairie Al Furqan</span>
        <h1>
          Des ouvrages islamiques,
          <br />
          <em>depuis Saint-Louis.</em>
        </h1>
        <p>
          Librairie islamique à Saint-Louis, Sénégal — Corans, tafsirs, ouvrages de croyance, spiritualité, langue
          arabe et littérature islamique.
        </p>
      </section>

      {categories.length > 0 && (
        <section className="about-taxonomy">
          <h2>Ce que vous trouverez</h2>
          <div className="about-taxonomy-list">
            {categories.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="about-ordering">
        <h2>Comment fonctionne une commande</h2>
        <div className="about-steps">
          {steps.map((step) => (
            <div className="about-step" key={step.n}>
              <span className="about-step-number">{step.n}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-delivery">
        <div>
          <span className="eyebrow">Saint-Louis → Sénégal</span>
          <h2>Vos livres, où que vous soyez au Sénégal.</h2>
          <p>
            Les options disponibles dépendent de votre destination. La librairie confirme la disponibilité, le mode
            de livraison et le montant final lors de la commande.
          </p>
        </div>
        <div className="about-delivery-facts">
          <span>
            <Truck size={18} /> Expédition depuis Saint-Louis
          </span>
          <span>
            <Truck size={18} /> Livraison via La Poste ou à une adresse
          </span>
          <Link href="/livraison" className="text-link">
            Voir les informations de livraison <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="about-contact">
        <div>
          <span className="eyebrow">Une question ?</span>
          <p>Écrivez directement à la librairie sur WhatsApp.</p>
        </div>
        <a
          className="button button-dark"
          href={buildWhatsAppUrl('Assalāmu ʿalaykum, j’aimerais en savoir plus sur la librairie Al Furqan.')}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} /> Écrire sur WhatsApp
        </a>
      </section>
    </main>
  );
}
