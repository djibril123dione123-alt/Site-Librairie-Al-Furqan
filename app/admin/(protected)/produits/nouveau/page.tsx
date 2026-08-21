import { ProductForm } from '@/components/admin/product-form';

export default function NouveauProduitPage({
  searchParams,
}: {
  searchParams?: { prefill?: string; title?: string };
}) {
  const initialTitle = searchParams?.prefill || searchParams?.title || '';

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ajouter un nouveau livre</h1>
          <p className="admin-page-subtitle">Créez une nouvelle fiche produit pour le catalogue de la Librairie Al Furqan.</p>
        </div>
      </div>

      <ProductForm initialData={{ title: initialTitle, status: 'draft' }} />
    </div>
  );
}
