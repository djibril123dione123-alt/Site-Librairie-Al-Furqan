import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/data/entities';
import { getProducts } from '@/lib/data/products';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EntityHeader } from '@/components/editorial/entity-header';
import { EntityBooks } from '@/components/editorial/entity-books';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.description || `Livres de la catégorie ${category.name} disponibles à la Librairie Al Furqan.`,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const products = await getProducts({ category: category.slug });
  const meta = products.length > 0 ? `${products.length} ouvrage${products.length > 1 ? 's' : ''}` : undefined;

  return (
    <main className="entity-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Catégories', href: '/categories' }, { label: category.name }]} />
      <EntityHeader eyebrow="Rayon éditorial" title={category.name} meta={meta} description={category.description} />
      {products.length > 0 && (
        <Link href={`/catalogue?categorie=${encodeURIComponent(category.name)}`} className="text-link entity-catalogue-link">
          Explorer dans le catalogue <ArrowRight size={16} />
        </Link>
      )}
      <EntityBooks
        products={products}
        emptyTitle="Aucun ouvrage actuellement disponible"
        emptyBody={`Aucun ouvrage n'est actuellement disponible dans la catégorie ${category.name}.`}
        catalogueHref="/catalogue"
      />
    </main>
  );
}
