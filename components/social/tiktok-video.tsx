'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { extractTikTokVideoId, tiktokEmbedUrl } from '@/lib/social/tiktok';

/**
 * TikTok's official direct player (no embed.js, no site-wide third-party
 * script) — rendered only after the visitor clicks the play card, so an
 * iframe is never loaded just because the section scrolled into view.
 * Falls back to a plain "view on TikTok" link whenever the id can't be
 * extracted (short share links) or the iframe itself fails to load, so a
 * deleted/private/malformed video never breaks the surrounding page.
 */
export function TikTokVideo({
  url,
  title,
  compact = false,
}: {
  url: string;
  title?: string;
  compact?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoId = extractTikTokVideoId(url);

  if (!videoId || failed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`tiktok-video-fallback${compact ? ' tiktok-video-fallback-compact' : ''}`}
      >
        Voir la vidéo sur TikTok
      </a>
    );
  }

  return (
    <div className={`tiktok-video${compact ? ' tiktok-video-compact' : ''}`}>
      {loaded ? (
        <iframe
          className="tiktok-video-iframe"
          src={tiktokEmbedUrl(videoId)}
          title={title ? `Vidéo TikTok — ${title}` : 'Vidéo TikTok'}
          loading="lazy"
          allow="encrypted-media; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
        />
      ) : (
        <button
          type="button"
          className="tiktok-video-playcard"
          onClick={() => setLoaded(true)}
          aria-label={title ? `Lire la vidéo TikTok : ${title}` : 'Lire la vidéo TikTok'}
        >
          <span className="tiktok-video-playcard-icon">
            <Play size={compact ? 16 : 24} fill="currentColor" />
          </span>
          {title && <span className="tiktok-video-playcard-title">{title}</span>}
          <span className="tiktok-video-playcard-hint">Lire sur TikTok</span>
        </button>
      )}
    </div>
  );
}
