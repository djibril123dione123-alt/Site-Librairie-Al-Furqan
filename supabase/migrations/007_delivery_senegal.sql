BEGIN;

-- ============================================================
-- 007_delivery_senegal.sql
-- Structure de données et Moteur de recherche pour l'UX Sénégal
-- Version canonique & idempotente
-- ============================================================

-- ============================================================
-- 1. Table senegal_locations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.senegal_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region text NOT NULL,
  department text,
  commune text,
  locality text NOT NULL,
  locality_type text,
  display_name text,
  normalized_name text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  aliases text[],
  coordinate_source text,
  coordinate_verified boolean DEFAULT false NOT NULL,
  source_name text,
  source_id text,
  source_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS locality_type text;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS normalized_name text;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS coordinate_source text;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS coordinate_verified boolean DEFAULT false;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.senegal_locations ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS senegal_locations_region_idx ON public.senegal_locations(region);
CREATE INDEX IF NOT EXISTS senegal_locations_department_idx ON public.senegal_locations(department);
CREATE INDEX IF NOT EXISTS senegal_locations_commune_idx ON public.senegal_locations(commune);
CREATE INDEX IF NOT EXISTS senegal_locations_locality_idx ON public.senegal_locations(locality);
CREATE INDEX IF NOT EXISTS senegal_locations_normalized_name_idx ON public.senegal_locations(normalized_name);


-- ============================================================
-- 2. Table delivery_points
-- ============================================================

CREATE TABLE IF NOT EXISTS public.delivery_points (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider text NOT NULL DEFAULT 'la_poste',
  name text NOT NULL,
  postal_code text,
  region text,
  department text,
  commune text,
  locality text,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  phone text,
  opening_hours text,
  coordinate_source text,
  coordinate_verified boolean DEFAULT false NOT NULL,
  source_name text,
  source_id text,
  source_url text,
  is_active boolean DEFAULT true NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.delivery_points ALTER COLUMN region DROP NOT NULL;
ALTER TABLE public.delivery_points ALTER COLUMN locality DROP NOT NULL;

ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS commune text;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS opening_hours text;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS coordinate_source text;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS coordinate_verified boolean DEFAULT false;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.delivery_points ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS delivery_points_provider_idx ON public.delivery_points(provider);
CREATE INDEX IF NOT EXISTS delivery_points_region_idx ON public.delivery_points(region);
CREATE INDEX IF NOT EXISTS delivery_points_locality_idx ON public.delivery_points(locality);


-- ============================================================
-- 3. Triggers updated_at
-- ============================================================

DROP TRIGGER IF EXISTS senegal_locations_updated_at ON public.senegal_locations;
CREATE TRIGGER senegal_locations_updated_at
  BEFORE UPDATE ON public.senegal_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS delivery_points_updated_at ON public.delivery_points;
CREATE TRIGGER delivery_points_updated_at
  BEFORE UPDATE ON public.delivery_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 4. RLS & Policies
-- ============================================================

ALTER TABLE public.senegal_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "senegal_locations_public_read" ON public.senegal_locations;
CREATE POLICY "senegal_locations_public_read"
  ON public.senegal_locations FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "delivery_points_public_read" ON public.delivery_points;
CREATE POLICY "delivery_points_public_read"
  ON public.delivery_points FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "senegal_locations_admin_all" ON public.senegal_locations;
CREATE POLICY "senegal_locations_admin_all"
  ON public.senegal_locations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delivery_points_admin_all" ON public.delivery_points;
CREATE POLICY "delivery_points_admin_all"
  ON public.delivery_points FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- 5. RPC Functions (Geo Query Engine)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_senegal_regions()
RETURNS TABLE(region text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT l.region 
  FROM public.senegal_locations l
  WHERE l.is_active = true
  ORDER BY l.region;
$$;

CREATE OR REPLACE FUNCTION public.get_senegal_departments(p_region text)
RETURNS TABLE(department text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT l.department 
  FROM public.senegal_locations l
  WHERE l.region = p_region AND l.department IS NOT NULL AND l.is_active = true
  ORDER BY l.department;
$$;

CREATE OR REPLACE FUNCTION public.get_senegal_communes(p_region text, p_department text DEFAULT NULL)
RETURNS TABLE(commune text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT l.commune 
  FROM public.senegal_locations l
  WHERE l.region = p_region 
    AND (p_department IS NULL OR p_department = '' OR l.department = p_department)
    AND l.commune IS NOT NULL AND l.is_active = true
  ORDER BY l.commune;
$$;

CREATE OR REPLACE FUNCTION public.search_senegal_localities(
  p_region text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_commune text DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  region text,
  department text,
  commune text,
  locality text,
  locality_type text,
  display_name text,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    l.id,
    l.region,
    l.department,
    l.commune,
    l.locality,
    l.locality_type,
    COALESCE(l.display_name, l.locality) as display_name,
    l.latitude,
    l.longitude
  FROM public.senegal_locations l
  WHERE l.is_active = true
    AND (p_region IS NULL OR p_region = '' OR l.region = p_region)
    AND (p_department IS NULL OR p_department = '' OR l.department = p_department)
    AND (p_commune IS NULL OR p_commune = '' OR l.commune = p_commune)
    AND (
      p_query IS NULL OR p_query = '' OR
      l.locality ILIKE '%' || p_query || '%' OR
      (l.normalized_name IS NOT NULL AND l.normalized_name ILIKE '%' || p_query || '%') OR
      (l.display_name IS NOT NULL AND l.display_name ILIKE '%' || p_query || '%')
    )
  ORDER BY l.locality
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_senegal_regions() TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_senegal_departments(text) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_senegal_communes(text, text) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_senegal_localities(text, text, text, text, integer) TO public, anon, authenticated;

COMMIT;