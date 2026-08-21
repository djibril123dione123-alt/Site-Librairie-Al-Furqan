import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';
import { seedProducts } from '@/lib/dev/seed-products';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface CatalogueFacets {
  categories: FacetOption[];
  authors: FacetOption[];
  publishers: FacetOption[];
  languages: FacetOption[];
  availabilities: FacetOption[];
  readings: FacetOption[];
  minPrice: number;
  maxPrice: number;
}

export async function getCatalogueFacets(): Promise<CatalogueFacets> {
  if (shouldUseSeedData()) {
    const catMap = new Map<string, number>();
    const autMap = new Map<string, number>();
    const pubMap = new Map<string, number>();
    const langMap = new Map<string, number>();
    const availMap = new Map<string, number>();
    const readingMap = new Map<string, number>();
    let minP = Infinity;
    let maxP = 0;

    seedProducts.forEach((p) => {
      if (p.category) catMap.set(p.category, (catMap.get(p.category) || 0) + 1);
      if (p.author) autMap.set(p.author, (autMap.get(p.author) || 0) + 1);
      if (p.publisher) pubMap.set(p.publisher, (pubMap.get(p.publisher) || 0) + 1);
      if (p.language) langMap.set(p.language, (langMap.get(p.language) || 0) + 1);
      if (p.availability) availMap.set(p.availability, (availMap.get(p.availability) || 0) + 1);
      if (p.reading) readingMap.set(p.reading, (readingMap.get(p.reading) || 0) + 1);
      if (p.price < minP) minP = p.price;
      if (p.price > maxP) maxP = p.price;
    });

    const toOptions = (map: Map<string, number>) =>
      Array.from(map.entries()).map(([val, count]) => ({ value: val, label: `${val} (${count})`, count }));

    return {
      categories: toOptions(catMap),
      authors: toOptions(autMap),
      publishers: toOptions(pubMap),
      languages: toOptions(langMap),
      availabilities: toOptions(availMap),
      readings: toOptions(readingMap),
      minPrice: minP === Infinity ? 0 : minP,
      maxPrice: maxP,
    };
  }

  const supabase = createServerClient();
  const { data: products } = await supabase
    .from('products')
    .select(`
      price,
      availability,
      language,
      reading,
      authors (name),
      publishers (name),
      categories (name)
    `)
    .eq('status', 'published');

  if (!products || products.length === 0) {
    return {
      categories: [],
      authors: [],
      publishers: [],
      languages: [],
      availabilities: [],
      readings: [],
      minPrice: 0,
      maxPrice: 0,
    };
  }

  const catMap = new Map<string, number>();
  const autMap = new Map<string, number>();
  const pubMap = new Map<string, number>();
  const langMap = new Map<string, number>();
  const availMap = new Map<string, number>();
  const readingMap = new Map<string, number>();
  let minP = Infinity;
  let maxP = 0;

  const { dbAvailabilityToUi } = await import('@/lib/types/mappers');

  products.forEach((p: any) => {
    const catName = p.categories?.name;
    const autName = p.authors?.name;
    const pubName = p.publishers?.name;
    const lang = p.language;
    const avail = dbAvailabilityToUi(p.availability);
    const reading = p.reading;
    const price = p.price || 0;

    if (catName) catMap.set(catName, (catMap.get(catName) || 0) + 1);
    if (autName) autMap.set(autName, (autMap.get(autName) || 0) + 1);
    if (pubName) pubMap.set(pubName, (pubName.get(pubName) || 0) + 1);
    if (lang) langMap.set(lang, (langMap.get(lang) || 0) + 1);
    if (avail) availMap.set(avail, (availMap.get(avail) || 0) + 1);
    if (reading) readingMap.set(reading, (readingMap.get(reading) || 0) + 1);

    if (price < minP) minP = price;
    if (price > maxP) maxP = price;
  });

  const toOptions = (map: Map<string, number>) =>
    Array.from(map.entries()).map(([val, count]) => ({ value: val, label: `${val} (${count})`, count }));

  return {
    categories: toOptions(catMap),
    authors: toOptions(autMap),
    publishers: toOptions(pubMap),
    languages: toOptions(langMap),
    availabilities: toOptions(availMap),
    readings: toOptions(readingMap),
    minPrice: minP === Infinity ? 0 : minP,
    maxPrice: maxP,
  };
}
