import Link from 'next/link';
import { ArrowRight, MessageCircle, Truck } from 'lucide-react';
import { siteConfig, buildWhatsAppUrl } from '@/lib/al-furqan-data';
import { getProducts } from '@/lib/data/products';
import { getCategories } from '@/lib/data/categories';
import { Hero } from '@/components/home/hero';
import { QuickSearchBox } from '@/components/home/search-buttons';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';
import { Cover } from '@/components/books/cover';
import { TikTokFeature } from '@/components/home/tiktok-feature';

export default async function Home() {
  const [categories, featuredProducts, restockedProducts] = await Promise.all([
    getCategories(),
    getProducts({ featured: true, limit: 4 }),
    getProducts({ restocked: true, limit: 4 }),
  ]);

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
        
        {categories.length > 0 && (
          <section className="category-section" id="categories">
            <SectionTitle eyebrow="PARCOURIR PAR UNIVERS" title="Le savoir, par affinités." link="Voir le catalogue" href="/catalogue" />
            <div className="category-grid">
              {categories.map((category, index) => (
                <Link href={`/catalogue?categorie=${encodeURIComponent(category.name)}`} key={category.id} className={`category-pill category-${index}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{category.name}</strong>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}
        
        {featuredProducts.length > 0 && (
          <section className="products-section">
            <SectionTitle
              eyebrow="À DÉCOUVRIR"
              title="Nouveautés chez Al Furqan"
              link="Voir toutes les nouveautés"
              href="/catalogue?nouveautes=1"
            />
            <div className="book-grid">
              {featuredProducts.map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
        
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
        
        {restockedProducts.length > 0 && (
          <section className="products-section restocked">
            <SectionTitle eyebrow="RÉAPPROVISIONNEMENTS" title="De retour chez Al Furqan" link="Voir les ouvrages" href="/catalogue" />
            <div className="book-grid">
              {restockedProducts.map((product) => (
                <BookCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <TikTokFeature />
        
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
                <Truck size={18} /> Livraison à une adresse
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
