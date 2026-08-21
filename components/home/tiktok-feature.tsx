import Link from 'next/link';
import { ArrowRight, Video } from 'lucide-react';
import { siteConfig } from '@/lib/al-furqan-data';

export function TikTokFeature() {
  return (
    <section className="social-section">
      <div className="social-heading">
        <span className="eyebrow">SUIVEZ-NOUS SUR TIKTOK</span>
        <h2>
          Al Furqan
          <br />
          <em>en vidéo.</em>
        </h2>
        <p>
          Présentations d&apos;ouvrages, conseils de lecture et découvertes éditoriales sur le compte officiel de la librairie.
        </p>
        <a
          href={siteConfig.tiktok}
          className="text-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Découvrir sur TikTok <ArrowRight size={16} />
        </a>
      </div>
      <div className="video-grid">
        <a
          href={siteConfig.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          className="video-card video-one"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <span className="play">
            <Video size={20} />
          </span>
          <span style={{ fontWeight: 600, fontSize: 16, marginTop: 12 }}>
            Retrouvez nos présentations d&apos;ouvrages sur TikTok
          </span>
          <span style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8 }}>@alfurqan.librairie ↗</span>
        </a>
      </div>
    </section>
  );
}
