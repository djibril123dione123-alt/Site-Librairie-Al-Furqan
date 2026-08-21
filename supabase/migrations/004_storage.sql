-- ============================================================
-- Migration 004 : Storage — bucket product-images
-- ============================================================
-- À exécuter après avoir créé le bucket dans Supabase Dashboard
-- ou via l'API Storage.
--
-- Note : La création du bucket se fait dans le Dashboard Supabase :
-- Storage > New Bucket > "product-images" > Public (read)
--
-- Les policies Storage ci-dessous complètent la configuration.
-- ============================================================

-- Policy Storage : lecture publique des images de produits publiés
-- (à exécuter dans le SQL editor Supabase)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lecture publique
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Upload réservé aux admins authentifiés
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Update réservé aux admins
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Delete réservé aux admins
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );
