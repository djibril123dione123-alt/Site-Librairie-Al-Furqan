import { Metadata } from 'next';
import Link from 'next/link';
import { getAuthors } from '@/lib/data/entities';
import { EditorialBreadcrumb } from '@/components/editorial/breadcrumb';
import { AuthorDirectory } from '@/components/editorial/author-directory';
import { EditorialEmptyState } from '@/components/editorial/empty-state';

export const metadata: Metadata = {
  title: 'Auteurs',
  description: 'Retrouvez les auteurs disponibles à la Librairie Al Furqan.',
  alternates: { canonical: '/auteurs' },
};

export default async function AuthorsIndexPage() {
  const authors = await getAuthors();

  return (
    <main className="entity-index-page">
      <EditorialBreadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Auteurs' }]} />
      <header className="entity-index-header">
        <span className="eyebrow">Auteurs</span>
        <h1>Auteurs</h1>
        <p>Classés par nombre d&apos;ouvrages disponibles, puis par ordre alphabétique.</p>
      </header>

      {authors.length > 0 ? (
        <AuthorDirectory authors={authors} />
      ) : (
        <EditorialEmptyState
          title="Aucun auteur référencé pour le moment"
          body="Les fiches auteurs seront disponibles au fur et à mesure de l'ajout des ouvrages au catalogue."
          ctaLabel="Voir le catalogue"
          ctaHref="/catalogue"
        />
      )}

      <div className="entity-cross-links">
        <Link href="/categories" className="text-link">Parcourir par catégorie →</Link>
        <Link href="/editeurs" className="text-link">Parcourir par éditeur →</Link>
      </div>
    </main>
  );
}
