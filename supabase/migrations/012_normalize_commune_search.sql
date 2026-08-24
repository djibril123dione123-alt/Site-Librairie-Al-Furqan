-- Phase I.2 — same apostrophe-normalization fix as migration 011
-- (search_senegal_departments), applied to the already-deployed
-- search_senegal_communes (010). Confirmed a real, not just theoretical,
-- case: "PATTE D'OIE" (DAKAR) is a real commune with a straight
-- apostrophe, so searching "Patte d'oie" typed without matching
-- punctuation, or "Patte d'oie" vs a typographic variant, previously
-- returned nothing.
--
-- CREATE OR REPLACE FUNCTION is idempotent — safe to run again with only
-- the WHERE clause changed. The SELECT still returns l.commune completely
-- unmodified; only the comparison strips apostrophe variants and
-- lowercases. Accents are untouched.

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
    AND (
      p_query IS NULL OR p_query = '' OR
      replace(replace(lower(l.commune), '''', ''), '’', '')
        ILIKE '%' || replace(replace(lower(p_query), '''', ''), '’', '') || '%'
    )
  ORDER BY l.commune
  LIMIT LEAST(p_limit, 100);
$$;

GRANT EXECUTE ON FUNCTION public.search_senegal_communes(text, text, integer) TO public, anon, authenticated;

COMMIT;
