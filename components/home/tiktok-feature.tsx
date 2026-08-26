import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { siteConfig } from '@/lib/al-furqan-data';
import { TikTokVideo } from '@/components/social/tiktok-video';

export interface VideoItem {
  id: string;
  videoUrl: string;
  productTitle?: string;
  productSlug?: string;
}

/**
 * Never rendered with fewer than 1 or more than 3 videos padded with
 * placeholders — 0 configured hides the whole section (the caller in
 * app/page.tsx is expected to only render this when videos.length > 0),
 * and the grid itself just lays out however many (1-3) actually exist.
 */
export function TikTokFeature({ videos }: { videos: VideoItem[] }) {
  if (videos.length === 0) return null;

  return (
    <section className="social-section">
      <div className="social-heading">
        <span className="eyebrow">SUR TIKTOK</span>
        <h2>Al Furqan en vidéo</h2>
        <p>Découvrez quelques ouvrages présentés par la librairie.</p>
        <a href={siteConfig.tiktok} className="text-link" target="_blank" rel="noopener noreferrer">
          Suivre Al Furqan sur TikTok <ArrowRight size={16} />
        </a>
      </div>
      <div className={`tiktok-showcase-grid tiktok-showcase-grid-${videos.length}`}>
        {videos.slice(0, 3).map((item) => (
          <div key={item.id} className="video-card-editorial">
            <TikTokVideo url={item.videoUrl} title={item.productTitle} compact />
            {item.productSlug && item.productTitle && (
              <Link href={`/livres/${item.productSlug}`} className="video-card-book-link">
                {item.productTitle}
              </Link>
            )}
            <a href={item.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="video-card-cta">
              Voir sur TikTok
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
