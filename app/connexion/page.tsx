import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return (
    <main className="info-page">
      <div className="info-hero" style={{ textAlign: 'center' }}>
        <span className="eyebrow">VOTRE COMPTE</span>
        <h1>Votre compte Al Furqan</h1>
        <p style={{ margin: '0 auto' }}>
          Retrouvez votre panier, vos favoris et vos préférences sur tous vos appareils.
        </p>
      </div>
      <div className="info-content" style={{ maxWidth: 420 }}>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
