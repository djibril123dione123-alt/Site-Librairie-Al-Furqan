'use client';

import { useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useCustomerSession } from './customer-session-provider';

const MIN_PASSWORD_LENGTH = 6;

function mapUpdateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('password should be at least') || (m.includes('password') && m.includes('character'))) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (m.includes('rate limit') || m.includes('security purposes')) {
    return 'Trop de tentatives. Merci de réessayer dans quelques minutes.';
  }
  if (m.includes('fetch') || m.includes('network')) {
    return 'Problème de connexion réseau. Vérifiez votre connexion et réessayez.';
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

export function ResetPasswordForm() {
  const { authReady, isAuthenticated } = useCustomerSession();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'done'>('idle');
  const [error, setError] = useState('');

  // The customer only reaches a real session here via a genuine recovery
  // link exchanged by /auth/callback — anything else (expired link, direct
  // visit) means no session, and we must not offer a password form with
  // nothing behind it (Phase J.3 §11).
  if (!authReady) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="delivery-inline-note" role="alert">
        <strong>Ce lien de réinitialisation est invalide ou a expiré</strong>
        <p className="delivery-hint">Demandez un nouveau lien depuis la page de connexion.</p>
        <a className="text-link" href="/connexion">
          Retour à la connexion
        </a>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="delivery-inline-note" role="status">
        <strong>Mot de passe mis à jour</strong>
        <p className="delivery-hint">Votre nouveau mot de passe est actif. Vous pouvez continuer vers votre compte.</p>
        <a className="text-link" href="/compte">
          Aller à mon compte
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      setStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      const supabase = createBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(mapUpdateError(updateError.message));
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setError('Une erreur est survenue. Réessayez dans un instant.');
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="delivery-field">
        <label className="delivery-field-label" htmlFor="reset-password">
          Nouveau mot de passe
        </label>
        <div className="auth-password-field">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="delivery-text-input"
            disabled={status === 'submitting'}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="delivery-hint" style={{ marginTop: 6 }}>
          Au moins {MIN_PASSWORD_LENGTH} caractères.
        </p>
      </div>

      <div className="delivery-field" style={{ marginTop: 14 }}>
        <label className="delivery-field-label" htmlFor="reset-confirm-password">
          Confirmer le mot de passe
        </label>
        <div className="auth-password-field">
          <input
            id="reset-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="delivery-text-input"
            disabled={status === 'submitting'}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showConfirmPassword}
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="delivery-error-text" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        className="button button-dark"
        disabled={status === 'submitting' || !password || !confirmPassword}
        style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}
      >
        {status === 'submitting' ? (
          'Mise à jour…'
        ) : (
          <>
            Mettre à jour le mot de passe <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
