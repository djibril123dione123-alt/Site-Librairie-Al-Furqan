import Link from 'next/link';
import { ArrowRight, Check, MessageCircle } from 'lucide-react';
import { getProducts } from '@/lib/data/products';
import { Cover } from '../books/cover';
import { HomeSearchButton } from './search-buttons';

export async function Hero() {
  const heroProducts = await getProducts({ limit: 3 });
  
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">LIBRAIRIE ISLAMIQUE · SAINT-LOUIS, SÉNÉGAL</span>
        <h1>
          Des livres pour <em>apprendre,</em>
          <br />
          comprendre et transmettre.
        </h1>
        <p>
          Découvrez une sélection de Corans, tafsirs, ouvrages de croyance, spiritualité, éducation, langue arabe et
          bien plus.
        </p>
        <div className="hero-actions">
          <Link href="/catalogue" className="button button-dark">
            Explorer le catalogue <ArrowRight size={17} />
          </Link>
          <Link href="/catalogue?nouveautes=1" className="button button-light">
            Voir les nouveautés
          </Link>
        </div>
        <div className="hero-notes">
          <span>
            <Check size={16} /> Livraison disponible au Sénégal
          </span>
          <span>
            <MessageCircle size={16} /> Commande simple via WhatsApp
          </span>
        </div>
        <HomeSearchButton />
      </div>
      <div className="hero-books" aria-hidden="true">
        <div className="hero-circle" />
        {heroProducts.map((product, index) => (
          <div key={product.id} className={`hero-book hero-book-${index}`}>
            <Cover product={product} />
          </div>
        ))}
        <span className="hero-caption">
          Une sélection pensée
          <br />
          pour votre chemin de lecture
        </span>
      </div>
    </section>
  );
}
