import { Suspense } from 'react';
import { getProducts } from '@/lib/data/products';
import { CatalogueClient } from '@/components/catalogue/catalogue-client';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const categoryParam = typeof searchParams['categorie'] === 'string' ? searchParams['categorie'] : undefined;
  const searchParam = typeof searchParams['q'] === 'string' ? searchParams['q'] : undefined;
  const newer = searchParams['nouveautes'] === '1';
  
  const languageParam = typeof searchParams['language'] === 'string' ? searchParams['language'] : undefined;
  const availabilityParam = typeof searchParams['availability'] === 'string' ? searchParams['availability'] : undefined;
  const readingParam = typeof searchParams['reading'] === 'string' ? searchParams['reading'] : undefined;

  // Fetch produits réels filtrés via Supabase
  const products = await getProducts({
    category: categoryParam,
    search: searchParam,
    newArrival: newer ? true : undefined,
    language: languageParam,
    availability: availabilityParam,
    reading: readingParam,
  });

  return (
    <Suspense fallback={<div style={{ padding: '100px 32px' }}>Chargement du catalogue...</div>}>
      <CatalogueClient 
        initialProducts={products} 
        searchParams={searchParams as { [key: string]: string | undefined }} 
      />
    </Suspense>
  );
}
