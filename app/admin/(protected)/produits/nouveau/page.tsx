import { ProductForm } from '@/components/admin/product-form';

export default function NouveauProduitPage() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ajouter un livre</h1>
          <p className="admin-page-subtitle">Le produit sera créé en brouillon et invisible sur le site.</p>
        </div>
      </div>
      <ProductForm />
    </div>
  );
}
