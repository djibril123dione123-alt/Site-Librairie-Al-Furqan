/**
 * TikTok URL handling — shared by client-side form validation, server-side
 * persistence validation, and the embedded player. Deliberately does not
 * call TikTok's API or follow redirects: it only recognizes TikTok's own
 * domains and extracts a numeric video id when the URL shape makes that
 * possible directly. Short share links (vm.tiktok.com, vt.tiktok.com,
 * tiktok.com/t/...) don't carry the id in the URL itself — those are still
 * accepted as valid TikTok content, but the player falls back to a "view on
 * TikTok" link instead of guessing at an embed.
 */

const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);

function parseTikTokUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!TIKTOK_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url;
}

export function isValidTikTokUrl(raw: string): boolean {
  return parseTikTokUrl(raw) !== null;
}

/**
 * Strips tracking query params/hash so the same video pasted with
 * different share parameters is stored consistently. Returns null for
 * anything that isn't a recognized TikTok URL.
 */
export function normalizeTikTokUrl(raw: string): string | null {
  const url = parseTikTokUrl(raw);
  if (!url) return null;
  url.search = '';
  url.hash = '';
  // Drop a trailing slash for consistency, but never touch the root path.
  const href = url.toString();
  return href.length > 1 && href.endsWith('/') ? href.slice(0, -1) : href;
}

/**
 * Extracts the numeric post id used by TikTok's embedded player
 * (https://www.tiktok.com/player/v1/{id}) from a canonical or
 * m.tiktok.com video URL. Returns null for short links, profile URLs, or
 * anything else that doesn't carry the id directly.
 */
export function extractTikTokVideoId(raw: string): string | null {
  const url = parseTikTokUrl(raw);
  if (!url) return null;
  const videoMatch = url.pathname.match(/\/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];
  const mMatch = url.pathname.match(/\/v\/(\d+)/);
  if (mMatch) return mMatch[1];
  return null;
}

export function tiktokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}`;
}
