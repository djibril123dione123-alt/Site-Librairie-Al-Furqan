import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Truck, MessageCircle, Video, BookOpen } from 'lucide-react';
import { formatPrice, buildWhatsAppUrl, getSiteUrl } from '@/lib/al-furqan-data';
import { getProductBySlug, getRelatedProducts } from '@/lib/data/products';
import { getEmbeddableVideoUrl } from '@/lib/utils/video-utils';
import { StockBadge } from '@/components/books/stock-badge';
import { ProductActions } from '@/components/books/product-actions';
import { RecentlyViewed } from '@/components/books/recently-viewed';
import { SectionTitle } from '@/components/ui/section-title';
import { BookCard } from '@/components/books/book-card';
import { ProductGallery } from '@/components/books/product-gallery';
import { MobileStickyCta } from '@/components/books/mobile-sticky-cta';
import { WhatsAppLink } from '@/components/books/whatsapp-link';

import { ProductViewTracker } from '@/components/books/product-view-tracker';

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

  const authorSlug = product.authorSlug || product.author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const publisherSlug = product.publisherSlug || (product.publisher ? product.publisher.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
  const categorySlug = product.categorySlug || product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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
      <ProductViewTracker productId={product.id} />
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
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.1, margin: '12px 0', textWrap: 'balance', letterSpacing: '-0.02em' }}>{product.title}</h1>
          <p className="product-author" style={{ fontSize: 14 }}>
            par <Link href={`/auteurs/${authorSlug}`} className="text-link" style={{ fontSize: 14 }}>
              {product.author}
            </Link>
          </p>
          <div className="product-price" style={{ fontSize: 32, marginTop: 24, marginBottom: 12 }}>{formatPrice(product.price)}</div>
          <StockBadge availability={product.availability} />
          <div className="product-shipping" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(17, 42, 50, 0.08)' }}>
            <Truck size={14} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 13 }}>Expédition depuis Saint-Louis <span style={{ opacity: 0.3, margin: '0 8px' }}>|</span> Livraison au Sénégal</span>
          </div>
          
          <ProductActions product={product} />
          
          <div className="whatsapp-product">
            <MessageCircle size={17} />
            <span>
              Vous préférez discuter d’abord ?{' '}
              <WhatsAppLink
                href={buildWhatsAppUrl(`Assalāmu ʿalaykum,\nje souhaite des informations sur « ${product.title} ».`)}
                productId={product.id}
              >
                Écrire sur WhatsApp
              </WhatsAppLink>
            </span>
          </div>
        </div>
      </div>
      
      <div className="product-detail-grid">
        <div>
          <span className="eyebrow" style={{ letterSpacing: '0.2em' }}>À PROPOS DE CE LIVRE</span>
          <h2 style={{ fontSize: 36, letterSpacing: '-0.02em', margin: '18px 0 24px', textWrap: 'balance' }}>Une lecture à garder près de soi.</h2>
          <p style={{ maxWidth: 480, textWrap: 'pretty', lineHeight: 1.8, fontSize: 15 }}>{product.description}</p>

          {(() => {
            const videoInfo = getEmbeddableVideoUrl(product.videoUrl);
            if (!videoInfo) return null;

            return (
              <div style={{ marginTop: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <span className="eyebrow" style={{ display: 'block', padding: '12px 16px', background: 'var(--bg)' }}>PRÉSENTATION VIDÉO</span>
                {videoInfo.type === 'iframe' ? (
                  <iframe
                    src={videoInfo.embedUrl}
                    title={`Présentation vidéo de ${product.title}`}
                    loading="lazy"
                    style={{ width: '100%', height: 315, border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', background: 'var(--surface)' }}>
                    <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
                      Une présentation vidéo est disponible sur TikTok / média externe.
                    </p>
                    <a
                      href={videoInfo.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-dark"
                    >
                      <Video size={16} /> Voir la vidéo de présentation ↗
                    </a>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        {specs.length > 0 && (
          <div className="specs">
            <span className="eyebrow">INFORMATIONS BIBLIOGRAPHIQUES</span>
            {specs.map((spec) => (
              <div key={spec.label}>
                <span>{spec.label}</span>
                {spec.href ? (
                  <Link href={spec.href} className="text-link" style={{ fontWeight: 500 }}>
                    {spec.value}
                  </Link>
                ) : (
                  <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{spec.value}</strong>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(() => {
        const insideImages = product.images?.filter(i => i.type === 'inside' || i.type === 'toc') || [];
        if (insideImages.length === 0) return null;
        
        return (
          <div style={{ maxWidth: 1080, margin: '0 auto 80px', padding: '0 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 60, alignItems: 'center', background: 'var(--cream)', padding: 60, borderRadius: 12 }}>
              <div>
                <span className="eyebrow" style={{ letterSpacing: '0.2em' }}>À L&apos;INTÉRIEUR</span>
                <h2 style={{ fontSize: 32, margin: '16px 0 24px', letterSpacing: '-0.02em' }}>L&apos;objet livre en détails.</h2>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>Explorez les pages intérieures, le sommaire et la mise en page de cette édition.</p>
                <a href="#" className="button button-dark" style={{ padding: '12px 24px', textDecoration: 'none' }}>
                  <BookOpen size={16} /> Feuilleter
                </a>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {insideImages.slice(0, 2).map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '3/4', background: 'var(--surface)', borderRadius: 6, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Intérieur ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {(() => {
        const otherImages = product.images?.filter(i => i.type !== 'inside' && i.type !== 'toc' && i.type !== 'cover') || [];
        if (otherImages.length < 2) return null;
        
        return (
          <div style={{ maxWidth: 1080, margin: '0 auto 80px', padding: '0 32px' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {otherImages.slice(0, 2).map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', height: 400, background: 'var(--surface-alt)', borderRadius: 12, overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Vue produit ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 40 }} />
                  </div>
                ))}
             </div>
          </div>
        );
      })()}
      
      
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
