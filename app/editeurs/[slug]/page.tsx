import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPublisherBySlug } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EntityHeader } from '@/components/editorial/entity-header';
import { EntityBooks } from '@/components/editorial/entity-books';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const publisher = await getPublisherBySlug(params.slug);
  if (!publisher) return {};

  return {
    title: publisher.name,
    description: publisher.description || `Livres publiés par ${publisher.name}, disponibles à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/editeurs/${publisher.slug}`,
    },
  };
}

export default async function PublisherPage({ params }: { params: { slug: string } }) {
  const publisher = await getPublisherBySlug(params.slug);
  if (!publisher) notFound();

  const products = await getProducts({ publisher: publisher.slug });
  const meta = products.length > 0 ? `${products.length} ouvrage${products.length > 1 ? 's' : ''}` : undefined;

  return (
    <main className="entity-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Éditeurs', href: '/editeurs' }, { label: publisher.name }]} />
      <EntityHeader eyebrow="Maison d'édition" title={publisher.name} meta={meta} description={publisher.description} />
      {products.length > 0 && (
        <Link href={`/catalogue?editeur=${encodeURIComponent(publisher.name)}`} className="text-link entity-catalogue-link">
          Explorer dans le catalogue <ArrowRight size={16} />
        </Link>
      )}
      <EntityBooks
        products={products}
        emptyTitle="Aucun ouvrage répertorié"
        emptyBody={`Aucun ouvrage de ${publisher.name} n'est actuellement répertorié dans le catalogue.`}
        catalogueHref="/catalogue"
      />
    </main>
  );
}
