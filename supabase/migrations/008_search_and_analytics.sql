-- ============================================================
-- Migration 008 : Recherche V1 & Analytics du Catalogue (Sécurisé)
-- ============================================================

-- Table catalog_events (analytics anonymes sans IP, user-agent ni fingerprint)
create table if not exists catalog_events (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null check (event_type in ('product_view', 'add_to_cart', 'whatsapp_click', 'restock_interest')),
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now() not null
);

create index if not exists catalog_events_type_idx on catalog_events(event_type);
create index if not exists catalog_events_date_idx on catalog_events(created_at);

-- RLS sur catalog_events
alter table catalog_events enable row level security;

drop policy if exists "Anon can insert catalog events" on catalog_events;
create policy "Anon can insert catalog events" on catalog_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Admins can select catalog events" on catalog_events;
create policy "Admins can select catalog events" on catalog_events
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Fonction RPC : recherche avancée relationnelle V1 avec extensions.unaccent et alias
create or replace function search_published_products(
  query_text text,
  max_limit integer default 50
)
returns setof uuid as $$
declare
  norm_query text;
begin
  if query_text is null or trim(query_text) = '' then
    return;
  end if;

  norm_query := lower(extensions.unaccent(trim(query_text)));

  return query
  select distinct p.id
  from products p
  left join authors a on p.author_id = a.id
  left join publishers pub on p.publisher_id = pub.id
  left join categories c on p.category_id = c.id
  left join product_variants v on v.product_id = p.id
  left join product_themes pt on pt.product_id = p.id
  left join themes t on pt.theme_id = t.id
  left join search_aliases sa on lower(extensions.unaccent(sa.alias)) like '%' || norm_query || '%'
  where p.status = 'published'
    and (
      lower(extensions.unaccent(p.title)) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(p.subtitle, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(p.description, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(p.isbn, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(p.language, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(p.reading, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(a.name, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(pub.name, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(c.name, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(v.sku, ''))) like '%' || norm_query || '%'
      or lower(extensions.unaccent(coalesce(t.name, ''))) like '%' || norm_query || '%'
      or (sa.canonical is not null and (
        lower(extensions.unaccent(p.title)) like '%' || lower(extensions.unaccent(sa.canonical)) || '%'
        or lower(extensions.unaccent(coalesce(c.name, ''))) like '%' || lower(extensions.unaccent(sa.canonical)) || '%'
      ))
    )
  limit max_limit;
end;
$$ language plpgsql security definer set search_path = pg_catalog, public, extensions;
