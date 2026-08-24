-- Phase I — delivery geographic intelligence.
--
-- The existing get_senegal_communes(p_region, p_department) requires a
-- region to already be selected, so a customer who knows "Ouakam" but not
-- which region it's in has no way to search for it. This mirrors that
-- function's exact structure/security model but makes the parent filters
-- optional and returns the ancestry alongside each match, so the client
-- can reverse-fill Region/Department once a Commune is chosen — read-only,
-- no schema change, same is_active-scoped senegal_locations table.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_senegal_communes(
  p_query text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(region text, department text, commune text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT l.region, l.department, l.commune
  FROM public.senegal_locations l
  WHERE l.is_active = true
    AND l.commune IS NOT NULL
    AND (p_region IS NULL OR p_region = '' OR l.region = p_region)
    AND (p_query IS NULL OR p_query = '' OR l.commune ILIKE '%' || p_query || '%')
  ORDER BY l.commune
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.search_senegal_communes(text, text, integer) TO public, anon, authenticated;

COMMIT;
