/**
 * Arabic typography — opt-in, content-level.
 *
 * Not imported by app/layout.tsx on purpose: loading these here would fetch
 * the Arabic font payload on every page, even the vast majority that render
 * no Arabic text. Import this module only from the specific component that
 * renders Arabic content (author names, reading labels, Quranic excerpts),
 * so the payload is scoped to the pages that actually need it.
 *
 * Usage:
 *   import { notoNaskhArabic } from '@/lib/fonts/arabic';
 *   <span className={`${notoNaskhArabic.variable} arabic-text`}>حفص</span>
 *
 * `.arabic-text` / `.arabic-text-feature` / `.arabic-inline` are defined in
 * app/globals.css and consume the --font-arabic / --font-arabic-feature
 * variables set below.
 */
import { Noto_Naskh_Arabic, Amiri } from 'next/font/google';

// Everyday Arabic: names, short labels (e.g. reading names, "حفص" / "ورش").
export const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-arabic',
  display: 'swap',
});

// Reserved for rare, high-impact moments only (a large Quranic excerpt on a
// collection page) — never for everyday UI labels.
export const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-arabic-feature',
  display: 'swap',
});
