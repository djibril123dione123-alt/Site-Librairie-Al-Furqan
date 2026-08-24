import { ProductForm } from '@/components/admin/product-form';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getAdminCategories() {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, position, is_visible')
    .eq('is_visible', true)
    .order('position');

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    position: c.position,
    isVisible: c.is_visible,
  }));
}

export default async function NouveauProduitPage({
  searchParams,
}: {
  searchParams?: { prefill?: string; title?: string };
}) {
  const categories = await getAdminCategories();
  const initialTitle = searchParams?.prefill || searchParams?.title || '';

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ajouter un nouveau livre</h1>
          <p className="admin-page-subtitle">Créez une nouvelle fiche produit pour le catalogue de la Librairie Al Furqan.</p>
        </div>
      </div>

      <ProductForm 
        initialData={{ title: initialTitle, status: 'draft' }} 
        categories={categories}
      />
    </div>
  );
}
