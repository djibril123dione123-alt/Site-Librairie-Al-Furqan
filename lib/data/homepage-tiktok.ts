import { isSupabaseConfigured, createServerClient, shouldUseSeedData } from '@/lib/supabase/server';

export type HomepageTikTokVideo = {
  id: string;
  videoUrl: string;
  position: number;
  productTitle?: string;
  productSlug?: string;
};

/**
 * Up to 3 librarian-chosen videos, active-only, ordered by their fixed
 * slot position — never more, and hidden entirely (empty array) rather
 * than padded with placeholders when fewer than 3 are configured.
 */
export async function getHomepageTikTokVideos(): Promise<HomepageTikTokVideo[]> {
  if (shouldUseSeedData() || !isSupabaseConfigured()) {
    return [];
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('homepage_tiktok_videos')
    .select('id, video_url, position, products(title, slug)')
    .eq('is_active', true)
    .gte('position', 1)
    .order('position', { ascending: true })
    .limit(3);

  if (error || !data) {
    if (error) console.error('[getHomepageTikTokVideos]', error.message);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    videoUrl: row.video_url,
    position: row.position,
    productTitle: row.products?.title,
    productSlug: row.products?.slug,
  }));
}
