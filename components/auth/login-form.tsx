'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { sanitizeNextPath } from '@/lib/auth/safe-redirect';
import { useCustomerSession } from './customer-session-provider';

type Mode = 'login' | 'signup' | 'forgot';
type Status = 'idle' | 'submitting' | 'error';

// A semantic kind alongside every mapped error message, so the UI can
// decide what to show (e.g. the resend-confirmation action) from what
// actually happened rather than pattern-matching the French display text —
// two different errors can share a word ("adresse") without sharing a
// meaning (Phase J.3.1 §6).
type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'invalid_email'
  | 'already_registered'
  | 'weak_password'
  | 'rate_limit'
  | 'network'
  | 'generic';

interface AuthError {
  message: string;
  kind: AuthErrorKind;
}

const MIN_PASSWORD_LENGTH = 6;
const NETWORK_ERROR: AuthError = {
  message: 'Problème de connexion réseau. Vérifiez votre connexion et réessayez.',
  kind: 'network',
};

// Supabase's own messages are English and sometimes technical — this maps
// the handful that can actually reach this form to factual French copy,
// without ever surfacing the raw error object to the customer (Phase J.3
// §18). Unmatched messages fall back to a generic, still-honest line.
function mapAuthError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return { message: 'Email ou mot de passe incorrect.', kind: 'invalid_credentials' };
  }
  if (m.includes('email not confirmed')) {
    return {
      message: "Cette adresse n'est pas encore confirmée. Vérifiez votre boîte mail pour activer votre compte.",
      kind: 'email_not_confirmed',
    };
  }
  if (m.includes('already registered') || m.includes('user already exists')) {
    return { message: 'Un compte existe déjà avec cette adresse. Essayez de vous connecter plutôt.', kind: 'already_registered' };
  }
  if (m.includes('password should be at least') || (m.includes('password') && m.includes('character'))) {
    return { message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`, kind: 'weak_password' };
  }
  if (m.includes('unable to validate email') || (m.includes('email') && m.includes('invalid'))) {
    return { message: "Cette adresse email n'est pas valide.", kind: 'invalid_email' };
  }
  if (m.includes('rate limit') || m.includes('security purposes')) {
    return { message: 'Trop de tentatives. Merci de réessayer dans quelques minutes.', kind: 'rate_limit' };
  }
  if (m.includes('fetch') || m.includes('network')) {
    return NETWORK_ERROR;
  }
  return { message: 'Une erreur est survenue. Réessayez dans un instant.', kind: 'generic' };
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams.get('next'), '/compte');
  const { isAuthenticated, authReady } = useCustomerSession();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null);
  const [callbackError] = useState(
    searchParams.get('error') === 'callback'
      ? 'Ce lien est invalide ou a expiré. Merci de réessayer ci-dessous.'
      : ''
  );
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendError, setResendError] = useState('');
  const [signupSent, setSignupSent] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (authReady && isAuthenticated) {
      window.location.href = next;
    }
  }, [authReady, isAuthenticated, next]);

  if (authReady && isAuthenticated) {
    return null;
  }

  function applyError(info: AuthError) {
    setError(info.message);
    setErrorKind(info.kind);
    setStatus('error');
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setErrorKind(null);
    setPassword('');
    setConfirmPassword('');
    setStatus('idle');
    setSignupSent(false);
    setForgotSent(false);
    setResendStatus('idle');
    setResendError('');
  }

  async function handleResendConfirmation() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setResendStatus('sending');
    setResendError('');
    try {
      const supabase = createBrowserClient();
      const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email: trimmed });
      if (resendErr) {
        setResendStatus('idle');
        setResendError(mapAuthError(resendErr.message).message);
        return;
      }
      setResendStatus('sent');
    } catch {
      setResendStatus('idle');
      setResendError(NETWORK_ERROR.message);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    setStatus('submitting');
    setError('');
    setErrorKind(null);
    setResendStatus('idle');
    setResendError('');
    try {
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        applyError(mapAuthError(signInError.message));
        return;
      }
      // isAuthenticated flips via the session listener; the effect above
      // handles the redirect once it does.
    } catch {
      applyError(NETWORK_ERROR);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      applyError({ message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`, kind: 'weak_password' });
      return;
    }
    if (password !== confirmPassword) {
      applyError({ message: 'Les deux mots de passe ne correspondent pas.', kind: 'generic' });
      return;
    }
    setStatus('submitting');
    setError('');
    setErrorKind(null);
    try {
      const supabase = createBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (signUpError) {
        applyError(mapAuthError(signUpError.message));
        return;
      }
      setSignupSent(true);
    } catch {
      applyError(NETWORK_ERROR);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setStatus('submitting');
    setError('');
    setErrorKind(null);
    try {
      const supabase = createBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/auth/nouveau-mot-de-passe')}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (resetError) {
        applyError(mapAuthError(resetError.message));
        return;
      }
      // Neutral outcome regardless of whether an account exists for this
      // address (Phase J.3 §18 — never confirm/deny account existence).
      // Supabase itself doesn't error for an unknown email here, so a
      // genuine `error` reaching this branch is an infra failure (rate
      // limit, invalid format, network) — never proof one way or the
      // other about the account, so it's safe to surface factually.
      setForgotSent(true);
    } catch {
      applyError(NETWORK_ERROR);
    }
  }

  if (signupSent) {
    return (
      <div className="delivery-inline-note" role="status">
        <strong>Vérifiez votre adresse email pour activer votre compte</strong>
        <p className="delivery-hint">
          Un email a été envoyé à {email.trim()}. Ouvrez le lien qu&apos;il contient pour activer votre compte, puis revenez vous connecter.
        </p>
        <button type="button" className="text-link" onClick={() => switchMode('login')}>
          Retour à la connexion
        </button>
      </div>
    );
  }

  if (forgotSent) {
    return (
      <div className="delivery-inline-note" role="status">
        <strong>Vérifiez votre boîte mail</strong>
        <p className="delivery-hint">
          Si un compte existe pour {email.trim()}, un lien de réinitialisation vient de lui être envoyé.
        </p>
        <button type="button" className="text-link" onClick={() => switchMode('login')}>
          Retour à la connexion
        </button>
      </div>
    );
  }

  const isEmailNotConfirmed = errorKind === 'email_not_confirmed';
  const displayedError = error || callbackError;

  return (
    <>
      {mode === 'forgot' ? (
        <form onSubmit={handleForgot}>
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
              disabled={status === 'submitting'}
            />
          </div>
          {displayedError && (
            <p className="delivery-error-text" role="alert" style={{ marginTop: 8 }}>
              {displayedError}
            </p>
          )}
          <button
            type="submit"
            className="button button-dark"
            disabled={status === 'submitting' || !email.trim()}
            style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}
          >
            {status === 'submitting' ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
          </button>
          <button
            type="button"
            className="text-link"
            style={{ marginTop: 14, display: 'block', textAlign: 'center', width: '100%' }}
            onClick={() => switchMode('login')}
          >
            Retour à la connexion
          </button>
        </form>
      ) : (
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
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
              disabled={status === 'submitting'}
            />
          </div>

          <div className="delivery-field" style={{ marginTop: 14 }}>
            <label className="delivery-field-label" htmlFor="login-password">
              Mot de passe
            </label>
            <div className="auth-password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
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
            {mode === 'signup' && (
              <p className="delivery-hint" style={{ marginTop: 6 }}>
                Au moins {MIN_PASSWORD_LENGTH} caractères.
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <div className="delivery-field" style={{ marginTop: 14 }}>
              <label className="delivery-field-label" htmlFor="login-confirm-password">
                Confirmer le mot de passe
              </label>
              <div className="auth-password-field">
                <input
                  id="login-confirm-password"
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
          )}

          {mode === 'login' && (
            <button
              type="button"
              className="text-link"
              style={{ marginTop: 10, display: 'block' }}
              onClick={() => switchMode('forgot')}
            >
              Mot de passe oublié ?
            </button>
          )}

          {displayedError && (
            <div style={{ marginTop: 8 }}>
              <p className="delivery-error-text" role="alert">
                {displayedError}
              </p>
              {isEmailNotConfirmed && (
                <>
                  <button
                    type="button"
                    className="text-link"
                    onClick={handleResendConfirmation}
                    disabled={resendStatus === 'sending'}
                    style={{ marginTop: 4 }}
                  >
                    {resendStatus === 'sent'
                      ? 'Email de confirmation renvoyé'
                      : resendStatus === 'sending'
                        ? 'Envoi…'
                        : "Renvoyer l'email de confirmation"}
                  </button>
                  {resendError && (
                    <p className="delivery-error-text" role="alert" style={{ marginTop: 4 }}>
                      {resendError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            className="button button-dark"
            disabled={status === 'submitting' || !email.trim() || !password || (mode === 'signup' && !confirmPassword)}
            style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}
          >
            {status === 'submitting' ? (
              'Envoi…'
            ) : mode === 'login' ? (
              <>
                Se connecter <ArrowRight size={16} />
              </>
            ) : (
              <>
                Créer mon compte <ArrowRight size={16} />
              </>
            )}
          </button>

          <button
            type="button"
            className="text-link"
            style={{ marginTop: 14, display: 'block', textAlign: 'center', width: '100%' }}
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Pas encore de compte ? Créer mon compte' : 'Déjà un compte ? Se connecter'}
          </button>
        </form>
      )}
      <p className="delivery-hint" style={{ marginTop: 20, textAlign: 'center' }}>
        Vous pouvez continuer à commander sans compte.
      </p>
    </>
  );
}
