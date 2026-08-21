import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Truck, MessageCircle } from 'lucide-react';
import { formatPrice, buildWhatsAppUrl, getSiteUrl } from '@/lib/al-furqan-data';
import { getProductBySlug, getRelatedProducts } from '@/lib/data/products';
import { StockBadge } from '@/components/books/stock-badge';
import { ProductActions } from '@/components/books/product-actions';
import { RecentlyViewed } from '@/components/books/recently-viewed';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';
import { ProductGallery } from '@/components/books/product-gallery';
import { MobileStickyCta } from '@/components/books/mobile-sticky-cta';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};

  return {
    title: `${product.title} — Librairie Al Furqan`,
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

  const authorSlug = product.author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const publisherSlug = product.publisher ? product.publisher.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
  const categorySlug = product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const specs: { label: string; value?: string; href?: string }[] = [
    { label: 'Auteur', value: product.author, href: `/auteurs/${authorSlug}` },
    { label: 'Éditeur', value: product.publisher, href: publisherSlug ? `/editeurs/${publisherSlug}` : undefined },
    { label: 'Catégorie', value: product.category, href: `/categories/${categorySlug}` },
    { label: 'Langue', value: product.language },
    { label: 'Lecture', value: product.reading },
    { label: 'Tajwid', value: product.tajwid ? 'Code couleur repères de récitation' : undefined },
    { label: 'Format', value: product.format },
    { label: 'Reliure', value: product.binding },
    { label: 'Édition', value: product.edition },
    { label: 'Année', value: product.year?.toString() },
    { label: 'Pages', value: product.pages?.toString() },
    { label: 'Dimensions', value: product.dimensions },
    { label: 'ISBN', value: product.isbn },
    { label: 'Public', value: product.audience },
    { label: 'Thèmes', value: product.themes.join(' · ') },
  ].filter((spec) => spec.value);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "brand": { "@type": "Brand", "name": product.publisher },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "XOF",
      "availability": product.availability === 'Indisponible temporairement' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Accueil", "item": getSiteUrl() },
      { "@type": "ListItem", "position": 2, "name": product.category, "item": `${getSiteUrl()}/categories/${categorySlug}` },
      { "@type": "ListItem", "position": 3, "name": product.title }
    ]
  };

  return (
    <main className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      
      <nav className="breadcrumb" aria-label="Fil d'Ariane">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <Link href={`/categories/${categorySlug}`}>{product.category}</Link>
        <ChevronDown size={14} />
        <span>{product.title}</span>
      </nav>
      
      <div className="product-layout">
        <ProductGallery product={product} />
        
        <div className="product-info">
          <Link href={`/categories/${categorySlug}`} className="eyebrow" style={{ textDecoration: 'none' }}>
            {product.category}
          </Link>
          <h1>{product.title}</h1>
          <p className="product-author">
            par <Link href={`/auteurs/${authorSlug}`} style={{ textDecoration: 'underline', color: 'inherit' }}>
              <strong>{product.author}</strong>
            </Link>
          </p>
          <div className="product-price">{formatPrice(product.price)}</div>
          <StockBadge availability={product.availability} />
          <p className="product-shipping">
            <Truck size={17} /> Expédition depuis Saint-Louis · Livraison disponible au Sénégal
          </p>
          
          <ProductActions product={product} />
          
          <div className="whatsapp-product">
            <MessageCircle size={17} />
            <span>
              Vous préférez discuter d’abord ?{' '}
              <a
                href={buildWhatsAppUrl(`Assalāmu ʿalaykum,\nje souhaite des informations sur « ${product.title} ».`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Écrire sur WhatsApp
              </a>
            </span>
          </div>
        </div>
      </div>
      
      <div className="product-detail-grid">
        <div>
          <span className="eyebrow">À PROPOS DE CE LIVRE</span>
          <h2>Une lecture à garder près de soi.</h2>
          <p>{product.description}</p>
        </div>
        {specs.length > 0 && (
          <div className="specs">
            <span className="eyebrow">INFORMATIONS BIBLIOGRAPHIQUES</span>
            {specs.map((spec) => (
              <div key={spec.label}>
                <span>{spec.label}</span>
                {spec.href ? (
                  <Link href={spec.href} style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                    <strong>{spec.value}</strong>
                  </Link>
                ) : (
                  <strong>{spec.value}</strong>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {related.length > 0 && (
        <section className="products-section related">
          <SectionTitle eyebrow="POUR POURSUIVRE VOTRE LECTURE" title="Dans le même univers" />
          <div className="book-grid">
            {related.map((item) => (
              <BookCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
      
      <RecentlyViewed currentProductId={product.id} />
      <MobileStickyCta product={product} />
    </main>
  );
}
