'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);
    setError('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      if (email === 'admin@alfurqan.local' && password === 'dev') {
        router.push(redirect);
        return;
      }
      setError('Supabase non configuré. En développement local, utilisez admin@alfurqan.local / dev');
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials') || authError.status === 400) {
          setError('Email ou mot de passe incorrect.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre adresse email avant de vous connecter.');
        } else if (authError.message.includes('rate limit')) {
          setError('Trop de tentatives infructueuses. Veuillez patienter un instant.');
        } else {
          setError(`Erreur de connexion au serveur (${authError.message}).`);
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError('Échec de la récupération du compte utilisateur.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single() as { data: { role: string } | null; error: any };

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError('Compte authentifié, mais aucun profil administrateur trouvé en base.');
        setLoading(false);
        return;
      }

      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        setError(`Accès refusé. Le rôle associé à ce compte (${profile.role}) n'a pas les privilèges administrateur.`);
        setLoading(false);
        return;
      }

      window.location.href = redirect;
    } catch (err: any) {
      setError(`Une erreur imprévue est survenue (${err.message || 'Erreur réseau'}).`);
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-card">
      <div className="admin-login-logo">
        <BookOpen size={24} className="text-[#0c2d38]" />
        <div>
          <strong>Al Furqan</strong>
          <small className="block text-[#718096]">Espace Administration</small>
        </div>
      </div>

      <h1 className="admin-login-title">Connexion Admin</h1>
      <p className="admin-login-sub">Accès réservé aux gestionnaires de la librairie.</p>

      {error && (
        <div className="admin-login-error flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email administrateur</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="admin@alfurqan.sn"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full justify-center text-sm py-3 mt-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Vérification...
            </>
          ) : (
            'Se connecter à l\'admin'
          )}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="admin-login-page">
      <Suspense fallback={<div className="text-center p-8">Chargement...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
