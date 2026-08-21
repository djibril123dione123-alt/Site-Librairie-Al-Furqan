-- ============================================================
-- Migration 002 : Row Level Security (RLS)
-- ============================================================
-- RLS garantit que les clients publics ne peuvent que lire
-- les données publiées, et que seuls les admins peuvent écrire.
-- ============================================================

-- Helper : vérifier si l'utilisateur courant est admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================================
alter table authors enable row level security;
alter table publishers enable row level security;
alter table categories enable row level security;
alter table themes enable row level security;
alter table audiences enable row level security;
alter table products enable row level security;
alter table product_themes enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table collections enable row level security;
alter table collection_products enable row level security;
alter table search_aliases enable row level security;
alter table search_events enable row level security;
alter table book_requests enable row level security;
alter table profiles enable row level security;

-- ============================================================
-- POLICIES — AUTHORS (lecture publique, écriture admin)
-- ============================================================
drop policy if exists "authors_public_read" on authors;
create policy "authors_public_read" on authors
  for select using (true);

drop policy if exists "authors_admin_write" on authors;
create policy "authors_admin_write" on authors
  for all using (is_admin());

-- ============================================================
-- POLICIES — PUBLISHERS
-- ============================================================
drop policy if exists "publishers_public_read" on publishers;
create policy "publishers_public_read" on publishers
  for select using (true);

drop policy if exists "publishers_admin_write" on publishers;
create policy "publishers_admin_write" on publishers
  for all using (is_admin());

-- ============================================================
-- POLICIES — CATEGORIES
-- ============================================================
drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read" on categories
  for select using (is_visible = true);

drop policy if exists "categories_admin_all" on categories;
create policy "categories_admin_all" on categories
  for all using (is_admin());

-- ============================================================
-- POLICIES — THEMES
-- ============================================================
drop policy if exists "themes_public_read" on themes;
create policy "themes_public_read" on themes
  for select using (true);

drop policy if exists "themes_admin_write" on themes;
create policy "themes_admin_write" on themes
  for all using (is_admin());

-- ============================================================
-- POLICIES — PRODUCTS
-- ============================================================
-- Public : uniquement les produits publiés
drop policy if exists "products_public_read" on products;
create policy "products_public_read" on products
  for select using (status = 'published');

-- Admin : CRUD complet
drop policy if exists "products_admin_all" on products;
create policy "products_admin_all" on products
  for all using (is_admin());

-- ============================================================
-- POLICIES — PRODUCT_THEMES
-- ============================================================
drop policy if exists "product_themes_public_read" on product_themes;
create policy "product_themes_public_read" on product_themes
  for select using (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.status = 'published'
    )
  );

drop policy if exists "product_themes_admin_write" on product_themes;
create policy "product_themes_admin_write" on product_themes
  for all using (is_admin());

-- ============================================================
-- POLICIES — PRODUCT_VARIANTS
-- ============================================================
drop policy if exists "variants_public_read" on product_variants;
create policy "variants_public_read" on product_variants
  for select using (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.status = 'published'
    )
  );

drop policy if exists "variants_admin_write" on product_variants;
create policy "variants_admin_write" on product_variants
  for all using (is_admin());

-- ============================================================
-- POLICIES — PRODUCT_IMAGES
-- ============================================================
drop policy if exists "images_public_read" on product_images;
create policy "images_public_read" on product_images
  for select using (
    exists (
      select 1 from products p
      where p.id = product_id
      and p.status = 'published'
    )
  );

drop policy if exists "images_admin_write" on product_images;
create policy "images_admin_write" on product_images
  for all using (is_admin());

-- ============================================================
-- POLICIES — COLLECTIONS
-- ============================================================
drop policy if exists "collections_public_read" on collections;
create policy "collections_public_read" on collections
  for select using (status = 'published');

drop policy if exists "collections_admin_all" on collections;
create policy "collections_admin_all" on collections
  for all using (is_admin());

-- ============================================================
-- POLICIES — COLLECTION_PRODUCTS
-- ============================================================
drop policy if exists "collection_products_public_read" on collection_products;
create policy "collection_products_public_read" on collection_products
  for select using (
    exists (
      select 1 from collections c
      where c.id = collection_id
      and c.status = 'published'
    )
  );

drop policy if exists "collection_products_admin_write" on collection_products;
create policy "collection_products_admin_write" on collection_products
  for all using (is_admin());

-- ============================================================
-- POLICIES — SEARCH ALIASES
-- ============================================================
drop policy if exists "aliases_public_read" on search_aliases;
create policy "aliases_public_read" on search_aliases
  for select using (true);

drop policy if exists "aliases_admin_write" on search_aliases;
create policy "aliases_admin_write" on search_aliases
  for all using (is_admin());

-- ============================================================
-- POLICIES — SEARCH EVENTS (insert public anonyme, lecture admin)
-- ============================================================
drop policy if exists "search_events_public_insert" on search_events;
create policy "search_events_public_insert" on search_events
  for insert with check (true);

drop policy if exists "search_events_admin_read" on search_events;
create policy "search_events_admin_read" on search_events
  for select using (is_admin());

-- ============================================================
-- POLICIES — BOOK REQUESTS (insert public anonyme, lecture admin)
-- ============================================================
drop policy if exists "book_requests_public_insert" on book_requests;
create policy "book_requests_public_insert" on book_requests
  for insert with check (true);

drop policy if exists "book_requests_admin_read" on book_requests;
create policy "book_requests_admin_read" on book_requests
  for select using (is_admin());

-- ============================================================
-- POLICIES — PROFILES
-- ============================================================
drop policy if exists "profiles_own_read" on profiles;
create policy "profiles_own_read" on profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles
  for all using (is_admin());
