import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteUrl } from '@/lib/al-furqan-data';
import { getProductBySlug, getRelatedProducts } from '@/lib/data/products';
import { ProductPageView } from '@/components/books/product-page-view';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};

  return {
    title: product.title,
    description: product.description,
    alternates: {
      canonical: `/livres/${product.slug}`,
    },
    openGraph: {
      title: product.title,
      description: product.description,
      url: `${getSiteUrl()}/livres/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product);
  const categorySlug = product.categorySlug || slugify(product.category);
  const hasPublisher = Boolean(product.publisher);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    // A real, verified brand only — never the publisher/author placeholder text.
    ...(hasPublisher ? { brand: { '@type': 'Brand', name: product.publisher } } : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'XOF',
      availability:
        product.availability === 'Indisponible temporairement'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: getSiteUrl() },
      { '@type': 'ListItem', position: 2, name: product.category, item: `${getSiteUrl()}/categories/${categorySlug}` },
      { '@type': 'ListItem', position: 3, name: product.title },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <ProductPageView product={product} related={related} />
    </>
  );
}
