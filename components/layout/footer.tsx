import Link from 'next/link';
import { BookOpen, MapPin } from 'lucide-react';
import { siteConfig, buildWhatsAppUrl } from '@/lib/al-furqan-data';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <span className="brand-symbol">
            <BookOpen size={18} />
          </span>
          <h3>Al Furqan</h3>
          <p>
            Des livres pour apprendre,
            <br />
            comprendre et transmettre.
          </p>
        </div>
        <div>
          <h4>Explorer</h4>
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/catalogue?nouveautes=1">Nouveautés</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/categories">Catégories</Link>
          <Link href="/auteurs">Auteurs</Link>
          <Link href="/editeurs">Éditeurs</Link>
        </div>
        <div>
          <h4>La librairie</h4>
          <Link href="/a-propos">À propos</Link>
          <Link href="/livraison">Livraison</Link>
          <Link href="/contact">Contact</Link>
          <a href={buildWhatsAppUrl('Assalāmu ʿalaykum, je souhaite vous contacter.')}>WhatsApp</a>
        </div>
        <div>
          <h4>Suivre Al Furqan</h4>
          <a href={siteConfig.tiktok} target="_blank" rel="noopener noreferrer">
            TikTok
          </a>
          <a href={siteConfig.facebook} target="_blank" rel="noopener noreferrer">
            Facebook Marketplace
          </a>
          <span className="footer-location">
            <MapPin size={14} /> {siteConfig.location}
          </span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Librairie Al Furqan</span>
        <span>{siteConfig.location}</span>
      </div>
    </footer>
  );
}
