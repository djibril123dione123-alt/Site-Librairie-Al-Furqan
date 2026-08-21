import { Suspense } from 'react';
import { getProductsPaginated } from '@/lib/data/products';
import { CatalogueClient } from '@/components/catalogue/catalogue-client';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const categoryParam = typeof searchParams['categorie'] === 'string' ? searchParams['categorie'] : undefined;
  const authorParam = typeof searchParams['auteur'] === 'string' ? searchParams['auteur'] : undefined;
  const publisherParam = typeof searchParams['editeur'] === 'string' ? searchParams['editeur'] : undefined;
  const searchParam = typeof searchParams['q'] === 'string' ? searchParams['q'] : undefined;
  const newer = searchParams['nouveautes'] === '1';
  
  const languageParam = typeof searchParams['language'] === 'string' ? searchParams['language'] : undefined;
  const availabilityParam = typeof searchParams['availability'] === 'string' ? searchParams['availability'] : undefined;
  const readingParam = typeof searchParams['reading'] === 'string' ? searchParams['reading'] : undefined;
  const pageParam = typeof searchParams['page'] === 'string' ? parseInt(searchParams['page'], 10) : 1;

  const { products, totalCount, page, totalPages } = await getProductsPaginated({
    category: categoryParam,
    author: authorParam,
    publisher: publisherParam,
    search: searchParam,
    newArrival: newer ? true : undefined,
    language: languageParam,
    availability: availabilityParam,
    reading: readingParam,
    page: pageParam,
    pageSize: 12,
  });

  return (
    <Suspense fallback={<div style={{ padding: '100px 32px', textAlign: 'center', color: 'var(--muted)' }}>Chargement du catalogue...</div>}>
      <CatalogueClient 
        initialProducts={products}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
        searchParams={searchParams as { [key: string]: string | undefined }} 
      />
    </Suspense>
  );
}
