-- ============================================================
-- VIDÉOS TIKTOK DE LA PAGE D'ACCUEIL
--
-- Trois emplacements fixes (position 1/2/3) que le libraire choisit
-- manuellement dans l'Admin — jamais un flux automatique, jamais lié à
-- l'API TikTok. Une position sans ligne = emplacement vide ; is_active
-- permet de masquer temporairement une vidéo sans perdre sa
-- configuration. product_id est un lien optionnel : une vidéo TikTok
-- peut présenter un livre précis ou rester un contenu librairie
-- général (voir products.video_url pour la vidéo PROPRE à une fiche
-- produit, une notion distincte et indépendante de cette table).
-- ============================================================

-- position 0 is reserved scratch space used only transiently while
-- swapping two slots (the unique constraint below means a direct A↔B
-- swap has to pass through a value neither row currently holds) —
-- application code only ever reads/writes positions 1-3 as real slots.
create table if not exists homepage_tiktok_videos (
  id uuid primary key default uuid_generate_v4(),
  video_url text not null,
  position integer not null check (position between 0 and 3),
  product_id uuid references products(id) on delete set null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (position)
);

drop trigger if exists homepage_tiktok_videos_updated_at on homepage_tiktok_videos;
create trigger homepage_tiktok_videos_updated_at
  before update on homepage_tiktok_videos
  for each row execute function set_updated_at();

alter table homepage_tiktok_videos enable row level security;

drop policy if exists "homepage_tiktok_videos_public_read" on homepage_tiktok_videos;
create policy "homepage_tiktok_videos_public_read" on homepage_tiktok_videos
  for select using (is_active = true);

drop policy if exists "homepage_tiktok_videos_admin_all" on homepage_tiktok_videos;
create policy "homepage_tiktok_videos_admin_all" on homepage_tiktok_videos
  for all using (is_admin());
