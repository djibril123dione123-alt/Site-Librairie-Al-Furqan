-- Phase I.1 — delivery geographic intelligence, completing the reverse-fill
-- hierarchy started in migration 010.
--
-- get_senegal_departments(p_region) requires a region to already be known,
-- so a customer who knows "Mbour" or "Thiès" but not which region it's in
-- has no way to search for it directly. This mirrors search_senegal_communes
-- (010) exactly — same table, same is_active scope, same optional-filter
-- shape, same SECURITY DEFINER/GRANT pattern — just one level up the
-- hierarchy. Read-only, no schema change.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_senegal_departments(
  p_query text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(region text, department text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT l.region, l.department
  FROM public.senegal_locations l
  WHERE l.is_active = true
    AND l.department IS NOT NULL
    AND (p_region IS NULL OR p_region = '' OR l.region = p_region)
    AND (p_query IS NULL OR p_query = '' OR l.department ILIKE '%' || p_query || '%')
  ORDER BY l.department
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.search_senegal_departments(text, text, integer) TO public, anon, authenticated;

COMMIT;
