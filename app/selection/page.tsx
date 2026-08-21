'use client';

import Link from 'next/link';
import { ChevronDown, Heart, ArrowRight } from 'lucide-react';
import { products } from '@/lib/al-furqan-data';
import { useStore } from '@/components/providers';
import { BookCard } from '@/components/books/book-card';

export default function SelectionPage() {
  const { wishlist } = useStore();
  const selected = products.filter((item) => wishlist.has(item.id));
  
  return (
    <main className="catalogue-page">
      <div className="breadcrumb">
        <Link href="/">Accueil</Link>
        <ChevronDown size={14} />
        <span>Ma sélection</span>
      </div>
      <div className="catalogue-heading">
        <div>
          <span className="eyebrow">POUR PLUS TARD</span>
          <h1>Ma sélection</h1>
          <p>Les ouvrages que vous souhaitez retrouver plus tard.</p>
        </div>
      </div>
      {selected.length ? (
        <div className="book-grid" style={{ maxWidth: 1216, margin: '0 auto', padding: '0 32px 100px' }}>
          {selected.map((item) => (
            <BookCard key={item.id} product={item} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={34} />
          <h2>Votre sélection est vide.</h2>
          <p>Mettez de côté les ouvrages qui vous intéressent.</p>
          <Link href="/catalogue" className="button button-dark">
            Découvrir le catalogue <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </main>
  );
}
