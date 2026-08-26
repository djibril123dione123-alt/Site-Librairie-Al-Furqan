import { isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HomepageTikTokManager } from '@/components/admin/homepage-tiktok-manager';

async function getAdminProductOptions() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase.from('products').select('id, title').order('title');
  return (data || []).map((p: any) => ({ id: p.id, title: p.title }));
}

export default async function VideosTikTokAdminPage() {
  const products = await getAdminProductOptions();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Vidéos TikTok</h1>
          <p className="admin-page-subtitle">
            Choisissez jusqu&apos;à 3 vidéos à mettre en avant sur la page d&apos;accueil.
          </p>
        </div>
      </div>

      <HomepageTikTokManager products={products} />
    </div>
  );
}
