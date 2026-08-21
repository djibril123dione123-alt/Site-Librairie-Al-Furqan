import Link from 'next/link';
import { ArrowRight, MessageCircle, Truck } from 'lucide-react';
import { categories, products, siteConfig, buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { Hero } from '@/components/home/hero';
import { QuickSearchBox } from '@/components/home/search-buttons';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';
import { Cover } from '@/components/books/cover';

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <section className="quick-search">
          <div>
            <span className="eyebrow">TROUVER RAPIDEMENT</span>
            <h2>Quel livre recherchez-vous ?</h2>
            <p>Par titre, auteur, thème ou édition.</p>
          </div>
          <QuickSearchBox />
        </section>
        
        <section className="category-section" id="categories">
          <SectionTitle eyebrow="PARCOURIR PAR UNIVERS" title="Le savoir, par affinités." link="Voir le catalogue" />
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link href={`/catalogue?categorie=${encodeURIComponent(category)}`} key={category} className={`category-pill category-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{category}</strong>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
        
        <section className="products-section">
          <SectionTitle
            eyebrow="À DÉCOUVRIR"
            title="Nouveautés chez Al Furqan"
            link="Voir toutes les nouveautés"
            href="/catalogue?nouveautes=1"
          />
          <div className="book-grid">
            {products
              .filter((p) => p.newArrival || p.featured)
              .slice(0, 4)
              .map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
          </div>
        </section>
        
        <section className="editorial-band">
          <div className="editorial-copy">
            <span className="eyebrow">COLLECTION ÉDITORIALE</span>
            <h2>
              Pour mieux
              <br />
              <em>comprendre</em> le Coran
            </h2>
            <p>Des ouvrages choisis pour passer de la lecture à la compréhension, et garder le plaisir d’apprendre.</p>
            <Link href="/collections/mieux-comprendre-le-coran" className="button button-cream">
              Découvrir la sélection <ArrowRight size={17} />
            </Link>
          </div>
          <div className="editorial-books">
            {products
              .filter((p) => ['tafsir-ibn-kathir', 'paraboles-coran', 'coran-warsh'].includes(p.id))
              .map((product) => (
                <div key={product.id}>
                  <Cover product={product} />
                </div>
              ))}
          </div>
        </section>
        
        <section className="coran-callout">
          <div className="callout-orbit" />
          <div className="callout-copy">
            <span className="eyebrow">ÉDITIONS DU CORAN</span>
            <h2>
              Trouver le Coran
              <br />
              <em>qui vous correspond.</em>
            </h2>
            <p>Hafs ou Warsh, Tajwid, traduction, format… Découvrez facilement les éditions disponibles.</p>
            <Link href="/catalogue?categorie=Coran" className="button button-dark">
              Explorer les Corans <ArrowRight size={17} />
            </Link>
          </div>
          <div className="callout-facts">
            <div>
              <strong>Hafs</strong>
              <span>Lecture</span>
            </div>
            <div>
              <strong>Warsh</strong>
              <span>Lecture</span>
            </div>
            <div>
              <strong>Tajwid</strong>
              <span>Repères de lecture</span>
            </div>
          </div>
        </section>
        
        <section className="products-section restocked">
          <SectionTitle eyebrow="RÉAPPROVISIONNEMENTS" title="De retour chez Al Furqan" link="Voir les ouvrages" />
          <div className="book-grid">
            {products
              .filter((p) => p.restocked || p.availability === 'Derniers exemplaires')
              .map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
          </div>
        </section>
        
        <section className="social-section">
          <div className="social-heading">
            <span className="eyebrow">DEPUIS TIKTOK</span>
            <h2>
              Al Furqan
              <br />
              <em>vous présente.</em>
            </h2>
            <p>
              Une vidéo peut ouvrir la porte vers une sélection de livres. Découvrez les ouvrages présentés par la
              librairie.
            </p>
            <a href={siteConfig.tiktok} className="text-link" target="_blank" rel="noopener noreferrer">
              Voir TikTok <ArrowRight size={16} />
            </a>
          </div>
          <div className="video-grid">
            <Link href="/collections/mieux-comprendre-le-coran" className="video-card video-one">
              <span className="play">▶</span>
              <span>5 ouvrages pour mieux comprendre le Coran</span>
            </Link>
            <Link href="/collections/apprendre-arabe" className="video-card video-two">
              <span className="play">▶</span>
              <span>Par où commencer pour apprendre l’arabe ?</span>
            </Link>
            <Link href="/collections/autour-du-mariage" className="video-card video-three">
              <span className="play">▶</span>
              <span>Une sélection autour du mariage</span>
            </Link>
          </div>
        </section>
        
        <section className="delivery-section">
          <div>
            <span className="eyebrow">SIMPLE ET HUMAIN</span>
            <h2>
              Vos livres, où que vous soyez
              <br />
              <em>au Sénégal.</em>
            </h2>
          </div>
          <div className="delivery-content">
            <p>
              Les options disponibles dépendent de votre destination. La librairie confirme la disponibilité, le mode de
              livraison et le montant final lors de la commande.
            </p>
            <div className="delivery-list">
              <span>
                <Truck size={18} /> La Poste
              </span>
              <span>
                <Truck size={18} /> Dem Dikk
              </span>
              <span>
                <Truck size={18} /> Tiak Tiak
              </span>
            </div>
            <Link href="/livraison" className="text-link">
              Voir les informations de livraison <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        
        <section className="request-section">
          <div>
            <span className="eyebrow">UNE RECHERCHE PARTICULIÈRE ?</span>
            <h2>
              Vous cherchez un
              <br />
              <em>ouvrage précis ?</em>
            </h2>
            <p>Vous ne le trouvez pas dans le catalogue ? Envoyez directement votre demande à Al Furqan.</p>
          </div>
          <a
            className="button button-dark"
            href={buildWhatsAppUrl('Assalāmu ʿalaykum,\nje recherche un ouvrage particulier. Pouvez-vous m’aider ?')}
          >
            <MessageCircle size={18} /> Demander sur WhatsApp
          </a>
        </section>
        
        <section className="about-section">
          <div className="about-mark">AF</div>
          <div>
            <span className="eyebrow">À PROPOS D’AL FURQAN</span>
            <h2>Une librairie dédiée au savoir et à la transmission.</h2>
            <p>
              Al Furqan rassemble des ouvrages pour accompagner la lecture, l’apprentissage et la vie quotidienne, à
              Saint-Louis et partout au Sénégal.
            </p>
            <Link href="/a-propos" className="text-link">
              En savoir plus <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
