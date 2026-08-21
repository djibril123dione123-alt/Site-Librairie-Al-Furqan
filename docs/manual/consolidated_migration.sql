-- ============================================================
-- MIGRATION CONSOLIDÉE AL FURQAN
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ============================================================
-- SCHÉMAS (001_schema.sql)
-- ============================================================
create table if not exists authors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  bio text,
  created_at timestamptz default now() not null
);

create table if not exists publishers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamptz default now() not null
);

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  image text,
  position integer default 0 not null,
  is_visible boolean default true not null,
  created_at timestamptz default now() not null
);

create table if not exists themes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

create table if not exists audiences (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz default now() not null
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'viewer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text,
  short_description text,
  description text,
  price integer,
  compare_at_price integer,
  currency text default 'XOF' not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  availability text not null default 'in_stock' check (availability in ('in_stock', 'out_of_stock', 'temporarily_unavailable', 'restocked', 'low_stock')),
  stock_quantity integer,
  language text,
  isbn text,
  pages integer,
  dimensions text,
  binding text,
  edition text,
  publication_year integer,
  featured boolean default false not null,
  new_arrival boolean default false not null,
  restocked boolean default false not null,
  has_variants boolean default false not null,
  reading text check (reading in ('Hafs', 'Warsh', null)),
  tajwid boolean,
  color text default 'navy',
  ink text default '#f7e6c4',
  author_id uuid references authors(id) on delete set null,
  publisher_id uuid references publishers(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  video_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  published_at timestamptz
);

create index if not exists products_status_idx on products(status);
create index if not exists products_slug_idx on products(slug);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_search_idx on products using gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(isbn, ''))
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

create table if not exists product_themes (
  product_id uuid not null references products(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (product_id, theme_id)
);

create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  sku text,
  price integer,
  stock_quantity integer,
  availability text check (availability in ('in_stock', 'out_of_stock', 'temporarily_unavailable', 'restocked', 'low_stock')),
  attributes jsonb not null default '{}',
  image_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists variants_updated_at on product_variants;
create trigger variants_updated_at
  before update on product_variants
  for each row execute function set_updated_at();

create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  position integer default 0 not null,
  type text default 'cover' not null check (type in ('cover', 'back', 'spine', 'inside', 'toc', 'other'))
);

-- On utilise un bloc DO pour éviter l'erreur si la contrainte existe déjà
do $$ 
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_variant_image') then
    alter table product_variants
      add constraint fk_variant_image
      foreign key (image_id) references product_images(id) on delete set null;
  end if;
end $$;

create table if not exists collections (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  eyebrow text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  image text,
  video_url text,
  position integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists collections_updated_at on collections;
create trigger collections_updated_at
  before update on collections
  for each row execute function set_updated_at();

create table if not exists collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  position integer default 0 not null,
  primary key (collection_id, product_id)
);

create table if not exists search_aliases (
  id uuid primary key default uuid_generate_v4(),
  alias text not null,
  normalized_alias text not null,
  canonical text not null
);

create index if not exists search_aliases_normalized_idx on search_aliases(normalized_alias);

create table if not exists search_events (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  normalized_query text not null,
  result_count integer not null default 0,
  created_at timestamptz default now() not null
);

create index if not exists search_events_date_idx on search_events(created_at);
create index if not exists search_events_results_idx on search_events(result_count);

create table if not exists book_requests (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  source text,
  created_at timestamptz default now() not null
);


-- ============================================================
-- RLS (002_rls.sql)
-- ============================================================
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$ language sql security definer stable;

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

-- Policies Authors
drop policy if exists "authors_public_read" on authors;
create policy "authors_public_read" on authors for select using (true);
drop policy if exists "authors_admin_write" on authors;
create policy "authors_admin_write" on authors for all using (is_admin());

-- Policies Publishers
drop policy if exists "publishers_public_read" on publishers;
create policy "publishers_public_read" on publishers for select using (true);
drop policy if exists "publishers_admin_write" on publishers;
create policy "publishers_admin_write" on publishers for all using (is_admin());

-- Policies Categories
drop policy if exists "categories_public_read" on categories;
create policy "categories_public_read" on categories for select using (is_visible = true);
drop policy if exists "categories_admin_all" on categories;
create policy "categories_admin_all" on categories for all using (is_admin());

-- Policies Themes
drop policy if exists "themes_public_read" on themes;
create policy "themes_public_read" on themes for select using (true);
drop policy if exists "themes_admin_write" on themes;
create policy "themes_admin_write" on themes for all using (is_admin());

-- Policies Products
drop policy if exists "products_public_read" on products;
create policy "products_public_read" on products for select using (status = 'published');
drop policy if exists "products_admin_all" on products;
create policy "products_admin_all" on products for all using (is_admin());

-- Policies Product Themes
drop policy if exists "product_themes_public_read" on product_themes;
create policy "product_themes_public_read" on product_themes for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published')
);
drop policy if exists "product_themes_admin_write" on product_themes;
create policy "product_themes_admin_write" on product_themes for all using (is_admin());

-- Policies Product Variants
drop policy if exists "variants_public_read" on product_variants;
create policy "variants_public_read" on product_variants for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published')
);
drop policy if exists "variants_admin_write" on product_variants;
create policy "variants_admin_write" on product_variants for all using (is_admin());

-- Policies Product Images
drop policy if exists "images_public_read" on product_images;
create policy "images_public_read" on product_images for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published')
);
drop policy if exists "images_admin_write" on product_images;
create policy "images_admin_write" on product_images for all using (is_admin());

-- Policies Collections
drop policy if exists "collections_public_read" on collections;
create policy "collections_public_read" on collections for select using (status = 'published');
drop policy if exists "collections_admin_all" on collections;
create policy "collections_admin_all" on collections for all using (is_admin());

-- Policies Collection Products
drop policy if exists "collection_products_public_read" on collection_products;
create policy "collection_products_public_read" on collection_products for select using (
  exists (select 1 from collections c where c.id = collection_id and c.status = 'published')
);
drop policy if exists "collection_products_admin_write" on collection_products;
create policy "collection_products_admin_write" on collection_products for all using (is_admin());

-- Policies Search Aliases
drop policy if exists "aliases_public_read" on search_aliases;
create policy "aliases_public_read" on search_aliases for select using (true);
drop policy if exists "aliases_admin_write" on search_aliases;
create policy "aliases_admin_write" on search_aliases for all using (is_admin());

-- Policies Analytics
drop policy if exists "search_events_public_insert" on search_events;
create policy "search_events_public_insert" on search_events for insert with check (true);
drop policy if exists "search_events_admin_read" on search_events;
create policy "search_events_admin_read" on search_events for select using (is_admin());

drop policy if exists "book_requests_public_insert" on book_requests;
create policy "book_requests_public_insert" on book_requests for insert with check (true);
drop policy if exists "book_requests_admin_read" on book_requests;
create policy "book_requests_admin_read" on book_requests for select using (is_admin());

-- Policies Profiles
drop policy if exists "profiles_own_read" on profiles;
create policy "profiles_own_read" on profiles for select using (id = auth.uid());
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all using (is_admin());


-- ============================================================
-- SEED DATA (003_seed_categories.sql)
-- ============================================================
insert into categories (name, slug, position, is_visible) values
  ('Coran', 'coran', 0, true),
  ('Tafsir', 'tafsir', 1, true),
  ('Invocations & Dhikr', 'invocations-dhikr', 2, true),
  ('Croyance & Foi', 'croyance-foi', 3, true),
  ('Spiritualité', 'spiritualite', 4, true),
  ('Mariage', 'mariage', 5, true),
  ('Femme', 'femme', 6, true),
  ('Jeunesse', 'jeunesse', 7, true),
  ('Récits', 'recits', 8, true),
  ('Éducation', 'education', 9, true),
  ('Arabe', 'arabe', 10, true),
  ('Packs', 'packs', 11, true)
on conflict (slug) do nothing;

insert into search_aliases (alias, normalized_alias, canonical) values
  ('quran', 'quran', 'coran'),
  ('qur''an', 'qur an', 'coran'),
  ('koran', 'koran', 'coran'),
  ('warch', 'warch', 'warsh'),
  ('varch', 'varch', 'warsh'),
  ('aqidah', 'aqidah', 'aqida'),
  ('aqîda', 'aqida', 'aqida'),
  ('zikr', 'zikr', 'dhikr'),
  ('ibn kathîr', 'ibn kathir', 'ibn kathir'),
  ('ibn al-qayyim', 'ibn al qayyim', 'ibn qayyim')
on conflict do nothing;


-- ============================================================
-- STORAGE (004_storage.sql)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert with check (
  bucket_id = 'product-images' and auth.role() = 'authenticated' and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update using (
  bucket_id = 'product-images' and auth.role() = 'authenticated' and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
);

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects for delete using (
  bucket_id = 'product-images' and auth.role() = 'authenticated' and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
);
