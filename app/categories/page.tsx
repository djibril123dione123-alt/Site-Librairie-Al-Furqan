import { Metadata } from 'next';
import Link from 'next/link';
import { getCategories } from '@/lib/data/categories';
import { getCatalogueFacets } from '@/lib/data/facets';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CategoryDirectory } from '@/components/editorial/category-directory';

export const metadata: Metadata = {
  title: 'Catégories',
  description: 'Parcourez le catalogue de la Librairie Al Furqan par catégorie : Coran, Tafsir, croyance, spiritualité, langue arabe et plus.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesIndexPage() {
  const [categories, facets] = await Promise.all([getCategories(), getCatalogueFacets()]);
  const counts = new Map(facets.categories.map((f) => [f.value, f.count]));
  // A category with zero published products is a dead end for a customer —
  // it stays fully manageable in Admin, this only hides it from the public
  // directory until a published product actually uses it (Phase L §31).
  const withCounts = categories
    .map((c) => ({ ...c, count: counts.get(c.name) || 0 }))
    .filter((c) => c.count > 0);

  return (
    <main className="entity-index-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Catégories' }]} />
      <header className="entity-index-header">
        <span className="eyebrow">Taxonomie</span>
        <h1>Catégories</h1>
        <p>Qu&apos;est-ce que vous voulez lire ou apprendre ?</p>
      </header>

      <CategoryDirectory categories={withCounts} />

      <div className="entity-cross-links">
        <Link href="/auteurs" className="text-link">Parcourir par auteur →</Link>
        <Link href="/editeurs" className="text-link">Parcourir par éditeur →</Link>
      </div>
    </main>
  );
}
