/**
 * Utility de normalisation de texte et d'extension d'alias pour la recherche.
 * Partagé entre le serveur Supabase et le fallback dev.
 */

const TRANSLITERATION_ALIASES: Record<string, string[]> = {
  'coran': ['quran', "qur'an", 'koran', 'mushaf', 'mus-haf'],
  'warsh': ['warch', 'varch', 'wars'],
  'hafs': ['hafss', 'haf'],
  'aqida': ['aqidah', 'aqîda', 'croyance', 'tawhid', 'tawhîd'],
  'dhikr': ['zikr', 'invocations', 'doua', 'dou\'a', 'hisn'],
  'tafsir': ['tafsîr', 'exégèse', 'exegese', 'explication'],
  'ibn kathir': ['ibn kathîr', 'ibn katir', 'ibn katheer'],
  'ibn qayyim': ['ibn al-qayyim', 'ibn al qayyim', 'el qayyim'],
  'an-nawawi': ['nawawi', 'an nawawi', 'novovi'],
  'al-albani': ['albani', 'al albani'],
  'fawzan': ['al-fawzan', 'al fawzan'],
};

/**
 * Normalise une chaîne de caractères (accents, casse, caractères spéciaux).
 */
export function normalizeSearchString(input: string): string {
  if (!input) return '';
  let s = input.toLowerCase().trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[''`’]/g, "'");
  s = s.replace(/[^\w\s'-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Étend une requête avec ses alias phonétiques et translittérés connus.
 */
export function expandSearchAliases(normalizedQuery: string): string[] {
  const terms = normalizedQuery.split(' ').filter(Boolean);
  const expandedTerms = new Set<string>(terms);

  for (const term of terms) {
    for (const [key, aliases] of Object.entries(TRANSLITERATION_ALIASES)) {
      if (key.includes(term) || term.includes(key) || aliases.some((a) => a.includes(term))) {
        expandedTerms.add(key);
        aliases.forEach((a) => expandedTerms.add(a));
      }
    }
  }

  return Array.from(expandedTerms);
}
