import { Metadata } from 'next';
import Link from 'next/link';
import { getCollections } from '@/lib/data/collections';
import { Layers, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Collections Éditoriales — Librairie Al Furqan',
  description: 'Découvrez nos parcours de lecture et sélections thématiques d\'ouvrages islamiques.',
  alternates: {
    canonical: '/collections',
  },
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <nav aria-label="Fil d'Ariane" style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Accueil</Link> &nbsp;/&nbsp;{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Collections Éditoriales</span>
      </nav>

      <header style={{ marginBottom: 40 }}>
        <span className="eyebrow">Sélections Éditoriales</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginTop: 8, marginBottom: 12, color: 'var(--ink)' }}>
          Parcours de Lecture & Sélections
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 650 }}>
          Des ensembles d&apos;ouvrages soigneusement choisis par la Librairie Al Furqan pour vous guider dans votre apprentissage et votre méditation.
        </p>
      </header>

      {collections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)' }}>
          <Layers size={32} style={{ margin: '0 auto 12px', color: 'var(--gold)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Aucune collection publiée pour le moment</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 450, margin: '10px auto 24px' }}>
            Les parcours éditoriaux thématiques seront bientôt disponibles.
          </p>
          <Link href="/catalogue" className="button button-dark">
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {collections.map((col) => (
            <Link
              key={col.slug}
              href={`/collections/${col.slug}`}
              className="collection-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 28,
                background: 'var(--surface)',
                borderRadius: 12,
                border: '1px solid var(--line)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <div>
                <span className="eyebrow" style={{ fontSize: 10 }}>{col.eyebrow || 'Sélection'}</span>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', margin: '8px 0 12px' }}>
                  {col.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {col.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontWeight: 600, fontSize: 13, marginTop: 24 }}>
                <span>Découvrir la sélection</span>
                <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
