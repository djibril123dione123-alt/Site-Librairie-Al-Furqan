import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { QuickSearchBox } from '@/components/home/search-buttons';

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <span className="not-found-mark">404</span>
      <h1>Page introuvable</h1>
      <p>La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <div className="not-found-actions">
        <Link href="/" className="button button-light">
          Retour à l’accueil
        </Link>
        <Link href="/catalogue" className="button button-dark">
          Explorer le catalogue <ArrowRight size={17} />
        </Link>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <QuickSearchBox />
      </div>
    </main>
  );
}
