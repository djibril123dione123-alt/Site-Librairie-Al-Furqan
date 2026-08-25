import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  robots: { index: false, follow: false },
};

export default function NouveauMotDePassePage() {
  return (
    <main className="info-page">
      <div className="info-hero" style={{ textAlign: 'center' }}>
        <span className="eyebrow">VOTRE COMPTE</span>
        <h1>Nouveau mot de passe</h1>
        <p style={{ margin: '0 auto' }}>Choisissez un nouveau mot de passe pour votre compte Al Furqan.</p>
      </div>
      <div className="info-content" style={{ maxWidth: 420 }}>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
