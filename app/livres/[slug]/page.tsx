import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Truck, MessageCircle } from 'lucide-react';
import { findProduct, getRelatedProducts, formatPrice, buildWhatsAppUrl, getSiteUrl } from '@/lib/al-furqan-data';
import { Cover } from '@/components/books/cover';
import { StockBadge } from '@/components/books/stock-badge';
import { ProductActions } from '@/components/books/product-actions';
import { RecentlyViewed } from '@/components/books/recently-viewed';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = findProduct(params.slug);
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

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = findProduct(params.slug);
  
  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product);
  const specs: { label: string; value?: string }[] = [
    { label: 'Auteur', value: product.author },
    { label: 'Éditeur', value: product.publisher },
    { label: 'Langue', value: product.language },
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
      { "@type": "ListItem", "position": 2, "name": product.category, "item": `${getSiteUrl()}/catalogue?categorie=${encodeURIComponent(product.category)}` },
      { "@type": "ListItem", "position": 3, "name": product.title }
    ]
  };

  return (
    <main className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <Link href={`/catalogue?categorie=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        <ChevronDown size={14} />
        <span>{product.title}</span>
      </div>
      
      <div className="product-layout">
        <div className="product-gallery">
          <div className="gallery-main">
            <Cover product={product} />
          </div>
          <div className="gallery-caption">
            <span>Couverture de l’édition</span>
          </div>
        </div>
        
        <div className="product-info">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.title}</h1>
          <p className="product-author">
            par <strong>{product.author}</strong>
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
              <a href={buildWhatsAppUrl(`Assalāmu ʿalaykum,\nje souhaite des informations sur « ${product.title} ».`)}>
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
            <span className="eyebrow">INFORMATIONS</span>
            {specs.map((spec) => (
              <div key={spec.label}>
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
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
    </main>
  );
}
