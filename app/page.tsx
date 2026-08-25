import { getProducts } from '@/lib/data/products';
import { getCategories } from '@/lib/data/categories';
import { getCatalogueFacets } from '@/lib/data/facets';
import { getCollections } from '@/lib/data/collections';
import { Hero } from '@/components/home/hero';
import { CollectionFeature } from '@/components/home/collection-feature';
import { ProductDiscovery } from '@/components/home/product-discovery';
import { QuranDiscovery } from '@/components/home/quran-discovery';
import { CategoryTiles } from '@/components/home/category-tiles';
import { TrustSection } from '@/components/home/trust-section';
import { Reveal } from '@/components/home/reveal';

export default async function Home() {
  const [allProducts, categories, facets, collections] = await Promise.all([
    getProducts({ limit: 12 }),
    getCategories(),
    getCatalogueFacets(),
    getCollections(),
  ]);

  // Deterministic hero pick — never random, never hardcoded.
  const heroProduct =
    allProducts.find((p) => p.featured) || allProducts.find((p) => p.newArrival) || allProducts[0] || null;

  // Genuine new arrivals only (new_arrival flag, not "featured" relabelled),
  // with the hero's own pick removed so the same book isn't shown twice.
  const newArrivalProducts = allProducts
    .filter((p) => p.newArrival && p.id !== heroProduct?.id)
    .slice(0, 4);

  const featuredCollection = collections[0] || null;
  const collectionProducts = featuredCollection
    ? await getProducts({ collection: featuredCollection.slug, limit: 3 })
    : [];

  const categoryCounts = new Map(facets.categories.map((f) => [f.value, f.count]));
  // Same rule as /categories (Phase L §31): a category with zero published
  // products is never a real destination for a customer, so it never
  // occupies one of the homepage's 8 tiles either.
  const homeCategories = categories
    .map((c) => ({ ...c, count: categoryCounts.get(c.name) || 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.position - b.position)
    .slice(0, 8);

  return (
    <>
      <Hero product={heroProduct} />

      <main>
        {featuredCollection && collectionProducts.length > 0 && (
          <Reveal>
            <CollectionFeature collection={featuredCollection} products={collectionProducts} />
          </Reveal>
        )}

        <Reveal>
          <ProductDiscovery
            products={newArrivalProducts}
            eyebrow="À DÉCOUVRIR"
            title="Nouveautés chez Al Furqan"
            href="/catalogue?nouveautes=1"
          />
        </Reveal>

        <Reveal>
          <QuranDiscovery />
        </Reveal>

        <Reveal>
          <CategoryTiles categories={homeCategories} />
        </Reveal>

        <Reveal>
          <TrustSection />
        </Reveal>
      </main>
    </>
  );
}
