import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSSRClient } from '@/lib/supabase/auth';
import { AccountPageClient } from '@/components/account/account-page-client';

export const metadata: Metadata = {
  title: 'Mon compte',
  robots: { index: false, follow: false },
};

export default async function ComptePage() {
  const supabase = await createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/connexion?next=/compte');
  }

  return (
    <main className="info-page">
      <div className="info-hero">
        <span className="eyebrow">VOTRE COMPTE</span>
        <h1>Mon compte</h1>
        <p>{user.email}</p>
      </div>
      <div className="info-content" style={{ maxWidth: 620 }}>
        <AccountPageClient userId={user.id} />
      </div>
    </main>
  );
}
