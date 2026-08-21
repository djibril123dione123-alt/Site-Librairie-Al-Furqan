'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
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

    // Mode développement sans Supabase configuré
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
      // Accès dev simplifié
      if (email === 'admin@alfurqan.local' && password === 'dev') {
        router.push(redirect);
        return;
      }
      setError('Supabase non configuré. En développement, utilisez admin@alfurqan.local / dev');
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
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Authentification échouée. Réessayez.');
        setLoading(false);
        return;
      }

      // Vérifier le rôle admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single() as { data: { role: string } | null; error: any };

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Accès refusé. Ce compte n\'est pas administrateur.');
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <BookOpen size={22} />
          <span>
            <strong>Al Furqan</strong>
            <small>Librairie islamique</small>
          </span>
        </div>
        <h1 className="admin-login-title">Administration</h1>
        <p className="admin-login-sub">Accès réservé aux administrateurs.</p>
        {error && <div className="admin-login-error">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="admin@example.com"
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
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
