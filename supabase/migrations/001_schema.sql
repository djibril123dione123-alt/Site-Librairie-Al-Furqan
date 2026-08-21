-- ============================================================
-- Migration 001 : Schéma principal Al Furqan
-- ============================================================
-- Exécuter dans le SQL Editor de votre projet Supabase
-- ou via : supabase db push
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ============================================================
-- AUTEURS
-- ============================================================
create table if not exists authors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  bio text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- ÉDITEURS
-- ============================================================
create table if not exists publishers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- CATÉGORIES
-- ============================================================
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

-- ============================================================
-- THÈMES
-- ============================================================
create table if not exists themes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

-- ============================================================
-- PUBLICS
-- ============================================================
create table if not exists audiences (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

-- ============================================================
-- PROFILS ADMIN
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz default now() not null
);

-- Trigger : créer profil automatiquement à l'inscription
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

-- ============================================================
-- PRODUITS
-- ============================================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text,
  short_description text,
  description text,

  -- Commerce
  price integer,               -- en XOF (centimes non utilisés en Sénégal)
  compare_at_price integer,
  currency text default 'XOF' not null,

  -- Statut
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  availability text not null default 'in_stock'
    check (availability in ('in_stock', 'out_of_stock', 'temporarily_unavailable', 'restocked', 'low_stock')),
  stock_quantity integer,

  -- Bibliographique
  language text,
  isbn text,
  pages integer,
  dimensions text,
  binding text,
  edition text,
  publication_year integer,

  -- Flags
  featured boolean default false not null,
  new_arrival boolean default false not null,
  restocked boolean default false not null,
  has_variants boolean default false not null,

  -- Coran spécifique
  reading text check (reading in ('Hafs', 'Warsh', null)),
  tajwid boolean,

  -- UI (cover généré tant qu'il n'y a pas de vraies photos)
  color text default 'navy',
  ink text default '#f7e6c4',

  -- Relations
  author_id uuid references authors(id) on delete set null,
  publisher_id uuid references publishers(id) on delete set null,
  category_id uuid references categories(id) on delete set null,

  -- Divers
  video_url text,

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  published_at timestamptz
);

-- Index pour la recherche
create index if not exists products_status_idx on products(status);
create index if not exists products_slug_idx on products(slug);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_search_idx on products using gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(isbn, ''))
);

-- Trigger updated_at
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

-- ============================================================
-- PRODUCT_THEMES (M2M)
-- ============================================================
create table if not exists product_themes (
  product_id uuid not null references products(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  primary key (product_id, theme_id)
);

-- ============================================================
-- PRODUCT_VARIANTS
-- ============================================================
create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  sku text,
  price integer,
  stock_quantity integer,
  availability text check (availability in ('in_stock', 'out_of_stock', 'temporarily_unavailable', 'restocked', 'low_stock')),
  attributes jsonb not null default '{}',
  image_id uuid,                -- référence vers product_images (ajoutée après)
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists variants_updated_at on product_variants;
create trigger variants_updated_at
  before update on product_variants
  for each row execute function set_updated_at();

-- ============================================================
-- PRODUCT_IMAGES
-- ============================================================
create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,   -- chemin dans le bucket Supabase Storage
  alt_text text,
  position integer default 0 not null,
  type text default 'cover' not null
    check (type in ('cover', 'back', 'spine', 'inside', 'toc', 'other'))
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

-- ============================================================
-- COLLECTIONS
-- ============================================================
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

-- ============================================================
-- COLLECTION_PRODUCTS (M2M)
-- ============================================================
create table if not exists collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  position integer default 0 not null,
  primary key (collection_id, product_id)
);

-- ============================================================
-- ALIASES DE RECHERCHE
-- ============================================================
create table if not exists search_aliases (
  id uuid primary key default uuid_generate_v4(),
  alias text not null,
  normalized_alias text not null,
  canonical text not null      -- forme canonique (ex: "coran")
);

create index if not exists search_aliases_normalized_idx on search_aliases(normalized_alias);

-- ============================================================
-- SEARCH EVENTS (analytics anonymes)
-- ============================================================
create table if not exists search_events (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  normalized_query text not null,
  result_count integer not null default 0,
  created_at timestamptz default now() not null
);

create index if not exists search_events_date_idx on search_events(created_at);
create index if not exists search_events_results_idx on search_events(result_count);

-- ============================================================
-- BOOK REQUESTS (demandes d'ouvrages)
-- ============================================================
create table if not exists book_requests (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  source text,              -- 'catalogue', 'search', 'product'
  created_at timestamptz default now() not null
);
