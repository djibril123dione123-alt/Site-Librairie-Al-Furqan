'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { sanitizeNextPath } from '@/lib/auth/safe-redirect';
import { useCustomerSession } from './customer-session-provider';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get('next'), '/compte');
  const { isAuthenticated, authReady } = useCustomerSession();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState(
    searchParams.get('error') === 'callback'
      ? 'Ce lien de connexion est invalide ou a expiré. Demandez-en un nouveau ci-dessous.'
      : ''
  );

  useEffect(() => {
    if (authReady && isAuthenticated) {
      window.location.href = next;
    }
  }, [authReady, isAuthenticated, next]);

  if (authReady && isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    setError('');
    try {
      const supabase = createBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
      });
      if (otpError) {
        setError("Impossible d'envoyer le lien de connexion pour le moment. Réessayez dans un instant.");
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch {
      setError("Impossible d'envoyer le lien de connexion pour le moment. Réessayez dans un instant.");
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="delivery-inline-note" role="status">
        <strong>Vérifiez votre boîte mail</strong>
        <p className="delivery-hint">
          Si un compte existe pour {email.trim()}, un lien de connexion vient de lui être envoyé. Ouvrez-le depuis cet appareil pour continuer.
        </p>
        <button type="button" className="text-link" onClick={() => setStatus('idle')}>
          Utiliser une autre adresse ou renvoyer le lien
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="delivery-field">
          <label className="delivery-field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="delivery-text-input"
            disabled={status === 'sending'}
            aria-invalid={status === 'error'}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        {error && (
          <p id="login-error" className="delivery-error-text" role="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="button button-dark"
          disabled={status === 'sending' || !email.trim()}
          style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}
        >
          {status === 'sending' ? 'Envoi…' : (
            <>
              Recevoir mon lien de connexion <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      <p className="delivery-hint" style={{ marginTop: 20, textAlign: 'center' }}>
        Vous pouvez continuer à commander sans compte.
      </p>
    </>
  );
}
