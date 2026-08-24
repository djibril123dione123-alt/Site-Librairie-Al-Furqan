import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { seedCategories } from '@/lib/dev/seed-products';
import { CategoryManager } from '@/components/admin/category-manager';

async function getAdminCategories() {
  if (!isSupabaseConfigured()) {
    return seedCategories.map((name: string, index: number) => ({
      id: `seed-${index}`,
      name,
      slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
      position: index,
      isVisible: true,
    }));
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, position, is_visible')
    .order('position');

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    position: c.position,
    isVisible: c.is_visible,
  }));
}

export default async function CategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Catégories</h1>
          <p className="admin-page-subtitle">Gérer l&apos;ordre et la visibilité des catégories du catalogue.</p>
        </div>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
