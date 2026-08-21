-- ============================================================
-- Migration 006 : Final Security & Performance
-- ============================================================

-- 1. Indexes for Foreign Keys (Supabase Performance Advisor)
create index if not exists idx_collection_products_product_id on collection_products(product_id);
create index if not exists idx_product_images_product_id on product_images(product_id);
create index if not exists idx_product_themes_theme_id on product_themes(theme_id);
create index if not exists idx_product_variants_product_id on product_variants(product_id);
create index if not exists idx_product_variants_image_id on product_variants(image_id);
create index if not exists idx_products_author_id on products(author_id);
create index if not exists idx_products_publisher_id on products(publisher_id);

-- 2. RLS Performance (Wrap auth.uid() in subselect for index usage)
drop policy if exists "profiles_own_read" on profiles;
create policy "profiles_own_read" on profiles for select using (id = (select auth.uid()));

-- 3. Security Definer Search Path Enforcement (Redondance au cas où 005 n'aurait pas tout couvert)
alter function public.handle_new_user() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.is_admin() set search_path = public;

-- 4. Clean up any accidental RPC exposures
-- is_admin doit rester accessible à PUBLIC pour le RLS. 
-- Son exposition via PostgREST RPC n'est pas une faille (elle retourne juste un booléen lié au profil)
-- mais elle est strictement sécurisée par le search_path.

-- Tenter de révoquer l'accès RPC pour rls_auto_enable (si présent dans le schéma public, souvent généré par certains templates)
do $$ 
begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end $$;
