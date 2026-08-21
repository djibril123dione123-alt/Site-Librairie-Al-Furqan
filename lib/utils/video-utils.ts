export interface EmbeddableVideo {
  type: 'iframe' | 'external';
  embedUrl: string;
  externalUrl: string;
}

export function getEmbeddableVideoUrl(rawUrl?: string | null): EmbeddableVideo | null {
  if (!rawUrl || !rawUrl.trim()) return null;

  const url = rawUrl.trim();

  // YouTube normalization
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      externalUrl: url,
    };
  }

  // Vimeo normalization
  const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'iframe',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      externalUrl: url,
    };
  }

  // TikTok normalization: TikTok embeds require specialized JS script, so external fallback is safer for standard clean UI
  if (url.includes('tiktok.com')) {
    return {
      type: 'external',
      embedUrl: url,
      externalUrl: url,
    };
  }

  // Generic iframe if it ends with embed or is a known embed URL
  if (url.includes('/embed/') || url.includes('/player/')) {
    return {
      type: 'iframe',
      embedUrl: url,
      externalUrl: url,
    };
  }

  return {
    type: 'external',
    embedUrl: url,
    externalUrl: url,
  };
}
