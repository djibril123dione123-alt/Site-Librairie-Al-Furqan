import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Editorial "Quran discovery" beat.
 *
 * No structured Lecture/Tajwid facet cards: the real product data currently
 * has null `reading`/`tajwid` values on every published product (verified
 * against the live database), so a Hafs/Warsh/Tajwid comparison would show
 * options with zero real backing — exactly the fabricated-choice problem
 * this rebuild is meant to remove. Typography carries the beat instead.
 */
export function QuranDiscovery() {
  return (
    <section className="home-band home-band-quran">
      <span className="quran-arabic" aria-hidden="true">القرآن الكريم</span>
      <div className="quran-copy">
        <span className="eyebrow">ÉDITIONS DU CORAN</span>
        <h2>
          Trouver le Coran
          <br />
          <em>qui vous correspond.</em>
        </h2>
        <p>Lecture, Tajwid, format, langue… découvrez facilement les éditions disponibles.</p>
        <Link href="/catalogue?categorie=Coran" className="button button-dark">
          Explorer les Corans <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
