import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAuthorBySlug } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { EditorialBreadcrumb } from '@/components/editorial/breadcrumb';
import { EntityHeader } from '@/components/editorial/entity-header';
import { EntityBooks } from '@/components/editorial/entity-books';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  if (!author) return {};

  return {
    title: author.name,
    description: author.bio || `Livres de ${author.name} disponibles à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/auteurs/${author.slug}`,
    },
  };
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const author = await getAuthorBySlug(params.slug);
  if (!author) notFound();

  const products = await getProducts({ author: author.slug });
  const meta = products.length > 0 ? `${products.length} ouvrage${products.length > 1 ? 's' : ''} disponible${products.length > 1 ? 's' : ''}` : undefined;

  return (
    <main className="entity-page">
      <EditorialBreadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Auteurs', href: '/auteurs' }, { label: author.name }]} />
      <EntityHeader eyebrow="Auteur" title={author.name} meta={meta} description={author.bio} />
      {products.length > 0 && (
        <Link href={`/catalogue?auteur=${encodeURIComponent(author.name)}`} className="text-link entity-catalogue-link">
          Explorer dans le catalogue <ArrowRight size={16} />
        </Link>
      )}
      <EntityBooks
        products={products}
        emptyTitle="Aucun ouvrage répertorié"
        emptyBody={`Aucun ouvrage de ${author.name} n'est actuellement répertorié dans le catalogue.`}
        catalogueHref="/catalogue"
      />
    </main>
  );
}
