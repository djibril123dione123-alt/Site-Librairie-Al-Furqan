/**
 * Only ever allow a relative internal path as a post-login destination.
 * Rejects external URLs, protocol-relative `//host`, backslash tricks, and
 * anything else that isn't a plain same-origin path — no open redirect.
 */
export function sanitizeNextPath(raw: string | null | undefined, fallback = '/compte'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  return raw;
}
