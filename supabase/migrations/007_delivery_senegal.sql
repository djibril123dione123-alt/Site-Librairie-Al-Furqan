-- ============================================================
-- 007_delivery_senegal.sql
-- Structure de données pour l'UX de livraison au Sénégal
-- ============================================================

-- 1. Table senegal_locations (hiérarchie géographique)
create table if not exists senegal_locations (
  id uuid primary key default uuid_generate_v4(),
  region text not null,
  department text,
  commune text,
  locality text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  aliases text[], -- ex: {"Ouakam", "Wakam"}
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists senegal_locations_region_idx on senegal_locations(region);
create index if not exists senegal_locations_locality_idx on senegal_locations(locality);

-- 2. Table delivery_points (points relais, bureaux de poste)
create table if not exists delivery_points (
  id uuid primary key default uuid_generate_v4(),
  provider text not null default 'la_poste', -- 'la_poste', 'point_relais', etc.
  name text not null,
  region text not null,
  department text,
  locality text not null,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  phone text,
  is_active boolean default true not null,
  verified_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists delivery_points_provider_idx on delivery_points(provider);
create index if not exists delivery_points_region_idx on delivery_points(region);

-- Triggers pour updated_at
drop trigger if exists senegal_locations_updated_at on senegal_locations;
create trigger senegal_locations_updated_at
  before update on senegal_locations
  for each row execute function set_updated_at();

drop trigger if exists delivery_points_updated_at on delivery_points;
create trigger delivery_points_updated_at
  before update on delivery_points
  for each row execute function set_updated_at();

-- ============================================================
-- RLS (Sécurité)
-- ============================================================
alter table senegal_locations enable row level security;
alter table delivery_points enable row level security;

-- Tout le monde peut lire les données actives
create policy "senegal_locations_public_read"
  on senegal_locations for select
  to public
  using (is_active = true);

create policy "delivery_points_public_read"
  on delivery_points for select
  to public
  using (is_active = true);

-- Seuls les admins peuvent modifier
create policy "senegal_locations_admin_all"
  on senegal_locations for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "delivery_points_admin_all"
  on delivery_points for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- Données de test / seed minimal pour le développement UX
-- (Ces données sont réelles mais non exhaustives)
-- ============================================================

-- Quelques localités majeures à Dakar
insert into senegal_locations (region, department, commune, locality, latitude, longitude) values
  ('Dakar', 'Dakar', 'Dakar Plateau', 'Dakar Plateau', 14.6677, -17.4339),
  ('Dakar', 'Dakar', 'Ouakam', 'Ouakam', 14.7183, -17.4870),
  ('Dakar', 'Dakar', 'Ngor', 'Ngor', 14.7471, -17.5146),
  ('Dakar', 'Pikine', 'Pikine', 'Pikine', 14.7610, -17.3917),
  ('Dakar', 'Rufisque', 'Rufisque', 'Rufisque', 14.7136, -17.2711),
  ('Thiès', 'Thiès', 'Thiès', 'Thiès', 14.7928, -16.9287),
  ('Thiès', 'Tivaouane', 'Tivaouane', 'Tivaouane', 14.9542, -16.8142),
  ('Saint-Louis', 'Saint-Louis', 'Saint-Louis', 'Saint-Louis', 16.0326, -16.4818)
on conflict do nothing;

-- Quelques bureaux de Poste avec coordonnées approximatives pour simuler l'UX Haversine
insert into delivery_points (provider, name, region, locality, address, latitude, longitude) values
  ('la_poste', 'Bureau de Poste Dakar Etoile', 'Dakar', 'Dakar Plateau', 'Place de l''Indépendance', 14.6677, -17.4339),
  ('la_poste', 'Bureau de Poste Ouakam', 'Dakar', 'Ouakam', 'Route de Ouakam', 14.7183, -17.4870),
  ('la_poste', 'Bureau de Poste Ngor', 'Dakar', 'Ngor', 'Route des Almadies', 14.7471, -17.5146),
  ('la_poste', 'Bureau de Poste Pikine', 'Dakar', 'Pikine', 'Boustane', 14.7610, -17.3917),
  ('la_poste', 'Bureau de Poste Rufisque', 'Dakar', 'Rufisque', 'Centre-ville', 14.7136, -17.2711),
  ('la_poste', 'Bureau de Poste Thiès', 'Thiès', 'Thiès', 'Quartier Escale', 14.7928, -16.9287),
  ('la_poste', 'Bureau de Poste Tivaouane', 'Thiès', 'Tivaouane', 'Près de la Mairie', 14.9542, -16.8142),
  ('la_poste', 'Bureau de Poste Saint-Louis', 'Saint-Louis', 'Saint-Louis', 'Île Nord', 16.0326, -16.4818)
on conflict do nothing;
