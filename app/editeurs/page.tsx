import { Metadata } from 'next';
import Link from 'next/link';
import { getPublishers } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PublisherDirectory } from '@/components/editorial/publisher-directory';
import { EmptyState } from '@/components/ui/empty-state';
import type { Product } from '@/lib/types/ui';

export const metadata: Metadata = {
  title: 'Éditeurs',
  description: "Retrouvez les maisons d'édition disponibles à la Librairie Al Furqan.",
  alternates: { canonical: '/editeurs' },
};

export default async function PublishersIndexPage() {
  const [publishers, allProducts] = await Promise.all([getPublishers(), getProducts({ limit: 100 })]);

  const productsByPublisherSlug = new Map<string, Product[]>();
  allProducts.forEach((p) => {
    if (!p.publisherSlug) return;
    const list = productsByPublisherSlug.get(p.publisherSlug) || [];
    list.push(p);
    productsByPublisherSlug.set(p.publisherSlug, list);
  });

  return (
    <main className="entity-index-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Éditeurs' }]} />
      <header className="entity-index-header">
        <span className="eyebrow">Éditeurs</span>
        <h1>Éditeurs</h1>
        <p>Classés par nombre de titres disponibles, puis par ordre alphabétique.</p>
      </header>

      {publishers.length > 0 ? (
        <PublisherDirectory publishers={publishers} productsByPublisherSlug={productsByPublisherSlug} />
      ) : (
        <EmptyState
          title="Aucun éditeur référencé pour le moment"
          body="Les fiches éditeurs seront disponibles au fur et à mesure de l'ajout des ouvrages au catalogue."
        >
          <Link href="/catalogue" className="button button-dark">
            Voir le catalogue
          </Link>
        </EmptyState>
      )}

      <div className="entity-cross-links">
        <Link href="/categories" className="text-link">Parcourir par catégorie →</Link>
        <Link href="/auteurs" className="text-link">Parcourir par auteur →</Link>
      </div>
    </main>
  );
}
