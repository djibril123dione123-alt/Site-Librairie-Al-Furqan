-- ============================================================
-- MANUAL PRODUCTION DML SCRIPT — LIBRAIRIE AL FURQAN
-- À COPIER-COLLER DANS LE DASHBOARD SUPABASE (SQL EDITOR)
-- Projet: ryrhopolzmcawscuwcak
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ANSD: ENRICHISSEMENT DES 25 240 LOCALITÉS EXISTANTES
-- ============================================================

UPDATE public.senegal_locations
SET
  locality_type = NULL,
  display_name = locality || COALESCE(' (' || commune || ')', COALESCE(' (' || department || ')', '')),
  normalized_name = lower(
    translate(
      locality || ' ' || COALESCE(commune, '') || ' ' || COALESCE(department, '') || ' ' || region,
      'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝáàâäãåéèêëíìîïóòôöõúùûüýÿ',
      'aaaaaaeeeeiiiiooooouuuuyaaaaaaeeeeiiiiooooouuuuyy'
    )
  ),
  source_name = 'ANSD RGPH-5 2023',
  source_url = 'https://www.ansd.sn/donnees-recensements',
  source_id = NULL,
  updated_at = NOW();


-- ============================================================
-- 2. LA POSTE: MISE À JOUR DES 129 POINTS CARTOGRAPHIÉS
-- ============================================================

UPDATE public.delivery_points
SET
  region = CASE
    -- 1. Nom contient directement la région
    WHEN UPPER(name) LIKE '%DAKAR%' THEN 'Dakar'
    WHEN UPPER(name) LIKE '%THIÈS%' OR UPPER(name) LIKE '%THIES%' THEN 'Thiès'
    WHEN UPPER(name) LIKE '%DIOURBEL%' THEN 'Diourbel'
    WHEN UPPER(name) LIKE '%FATICK%' THEN 'Fatick'
    WHEN UPPER(name) LIKE '%KAFFRINE%' THEN 'Kaffrine'
    WHEN UPPER(name) LIKE '%KAOLACK%' THEN 'Kaolack'
    WHEN UPPER(name) LIKE '%KÉDOUGOU%' OR UPPER(name) LIKE '%KEDOUGOU%' THEN 'Kédougou'
    WHEN UPPER(name) LIKE '%KOLDA%' THEN 'Kolda'
    WHEN UPPER(name) LIKE '%LOUGA%' THEN 'Louga'
    WHEN UPPER(name) LIKE '%MATAM%' THEN 'Matam'
    WHEN UPPER(name) LIKE '%SAINT-LOUIS%' OR UPPER(name) LIKE '%SAINT LOUIS%' THEN 'Saint-Louis'
    WHEN UPPER(name) LIKE '%SÉDHIOU%' OR UPPER(name) LIKE '%SEDHIOU%' THEN 'Sédhiou'
    WHEN UPPER(name) LIKE '%TAMBACOUNDA%' THEN 'Tambacounda'
    WHEN UPPER(name) LIKE '%ZIGUINCHOR%' THEN 'Ziguinchor'

    -- 2. Villes / Localités connues attribuées avec certitude
    WHEN UPPER(name) LIKE '%RUFISQUE%' OR UPPER(name) LIKE '%PIKINE%' OR UPPER(name) LIKE '%GUEDIAWAYE%' OR UPPER(name) LIKE '%KEUR MASSAR%' OR UPPER(name) LIKE '%BARGNY%' OR UPPER(name) LIKE '%GOREE%' OR UPPER(name) LIKE '%YOFF%' OR UPPER(name) LIKE '%OUAKAM%' OR UPPER(name) LIKE '%MBAO%' OR UPPER(name) LIKE '%YENNE%' OR UPPER(name) LIKE '%HLM%' OR UPPER(name) LIKE '%VDN%' THEN 'Dakar'
    WHEN UPPER(name) LIKE '%MBOUR%' OR UPPER(name) LIKE '%SALY%' OR UPPER(name) LIKE '%TIVAOUANE%' OR UPPER(name) LIKE '%POPENGUINE%' OR UPPER(name) LIKE '%MEKHE%' OR UPPER(name) LIKE '%KHOMBOLE%' OR UPPER(name) LIKE '%BAMBEY%' OR UPPER(name) LIKE '%DIOFIOR%' OR UPPER(name) LIKE '%THIADIAYE%' OR UPPER(name) LIKE '%SINDIA%' THEN 'Thiès'
    WHEN UPPER(name) LIKE '%TOUBA%' OR UPPER(name) LIKE '%MBACKE%' OR UPPER(name) LIKE '%DAROU MOUSTY%' THEN 'Diourbel'
    WHEN UPPER(name) LIKE '%RICHARD%' OR UPPER(name) LIKE '%PODOR%' OR UPPER(name) LIKE '%NDIOUM%' OR UPPER(name) LIKE '%ROSS BETHIO%' OR UPPER(name) LIKE '%ROSSO%' OR UPPER(name) LIKE '%MPAL%' THEN 'Saint-Louis'
    WHEN UPPER(name) LIKE '%FOUNDIOUGNE%' OR UPPER(name) LIKE '%GANDIAYE%' OR UPPER(name) LIKE '%SINE%' OR UPPER(name) LIKE '%PASSY%' OR UPPER(name) LIKE '%SOKONE%' OR UPPER(name) LIKE '%KARANG%' THEN 'Fatick'
    WHEN UPPER(name) LIKE '%BIRKELANE%' OR UPPER(name) LIKE '%KOUNGHEUL%' OR UPPER(name) LIKE '%MALEM%' THEN 'Kaffrine'
    WHEN UPPER(name) LIKE '%NIORO%' OR UPPER(name) LIKE '%NDOFFANE%' OR UPPER(name) LIKE '%GUINGUINEO%' THEN 'Kaolack'
    WHEN UPPER(name) LIKE '%BIGNONA%' OR UPPER(name) LIKE '%OUSSOUYE%' OR UPPER(name) LIKE '%CABROUSSE%' OR UPPER(name) LIKE '%DIOULOULOU%' OR UPPER(name) LIKE '%THIONK%' OR UPPER(name) LIKE '%ELINKINE%' OR UPPER(name) LIKE '%ADEANE%' THEN 'Ziguinchor'
    WHEN UPPER(name) LIKE '%VELINGARA%' OR UPPER(name) LIKE '%MEDINA YORO%' OR UPPER(name) LIKE '%DIAOBE%' THEN 'Kolda'
    WHEN UPPER(name) LIKE '%BOUNKILING%' OR UPPER(name) LIKE '%MARSASSOUM%' OR UPPER(name) LIKE '%TANAFF%' THEN 'Sédhiou'
    WHEN UPPER(name) LIKE '%KEBEMER%' OR UPPER(name) LIKE '%LINGUERE%' OR UPPER(name) LIKE '%GUEOUL%' OR UPPER(name) LIKE '%NDANDE%' OR UPPER(name) LIKE '%SAGATTA%' THEN 'Louga'
    WHEN UPPER(name) LIKE '%RANEROU%' OR UPPER(name) LIKE '%THILOGNE%' OR UPPER(name) LIKE '%OREFONDE%' OR UPPER(name) LIKE '%AGNAM%' OR UPPER(name) LIKE '%KANEL%' OR UPPER(name) LIKE '%WAOUNDE%' OR UPPER(name) LIKE '%SEMME%' OR UPPER(name) LIKE '%BOKILADJI%' OR UPPER(name) LIKE '%DEMBANKANE%' OR UPPER(name) LIKE '%DONDOU%' OR UPPER(name) LIKE '%NDOULOUMADJI%' THEN 'Matam'
    WHEN UPPER(name) LIKE '%KIDIRA%' OR UPPER(name) LIKE '%GOUDIRY%' OR UPPER(name) LIKE '%KOUMPENTOUM%' OR UPPER(name) LIKE '%KOUSSANAR%' OR UPPER(name) LIKE '%BAKEL%' OR UPPER(name) LIKE '%MOUDERY%' OR UPPER(name) LIKE '%YAFERA%' OR UPPER(name) LIKE '%AROUNDOU%' OR UPPER(name) LIKE '%MISSIRAH%' OR UPPER(name) LIKE '%GABOU%' THEN 'Tambacounda'
    WHEN UPPER(name) LIKE '%SALEMATA%' OR UPPER(name) LIKE '%SARAYA%' THEN 'Kédougou'

    -- STRICT REQUIREMENT: AUCUN FALLBACK ARTIFICIEL DAKAR -> NULL SI INCONNU
    ELSE NULL
  END,
  address = CASE
    WHEN address = name OR address = 'Bureau de Poste ' || name OR address LIKE 'Bureau de Poste %' THEN NULL
    ELSE address
  END,
  source_name = 'La Poste Sénégal',
  source_url = 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT',
  coordinate_source = 'official_google_mymaps',
  coordinate_verified = true,
  updated_at = NOW()
WHERE provider = 'la_poste';

COMMIT;

-- ============================================================
-- 3. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ============================================================

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 4. REQUÊTES DE VÉRIFICATION MESURÉES
-- ============================================================

-- A. Total localités ANSD enrichies (Attendu: 25240)
SELECT COUNT(*) as total_ansd FROM public.senegal_locations WHERE source_name = 'ANSD RGPH-5 2023';

-- B. Total display_name non-null (Attendu: 25240)
SELECT COUNT(*) as ansd_display_name_non_null FROM public.senegal_locations WHERE display_name IS NOT NULL;

-- C. Total normalized_name non-null (Attendu: 25240)
SELECT COUNT(*) as ansd_normalized_name_non_null FROM public.senegal_locations WHERE normalized_name IS NOT NULL;

-- D. Total bureaux La Poste (Attendu: 129)
SELECT COUNT(*) as total_laposte FROM public.delivery_points WHERE provider = 'la_poste';

-- E. Total La Poste source_name (Attendu: 129)
SELECT COUNT(*) as laposte_source_name FROM public.delivery_points WHERE provider = 'la_poste' AND source_name = 'La Poste Sénégal';

-- F. Total La Poste coordinate_source (Attendu: 129)
SELECT COUNT(*) as laposte_coordinate_source FROM public.delivery_points WHERE provider = 'la_poste' AND coordinate_source = 'official_google_mymaps';

-- G. Total La Poste GPS (Attendu: 129)
SELECT COUNT(*) as laposte_gps FROM public.delivery_points WHERE provider = 'la_poste' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- H. Total La Poste Région NULL (Attendu: 6)
SELECT COUNT(*) as laposte_region_null FROM public.delivery_points WHERE provider = 'la_poste' AND region IS NULL;

-- I. Distribution réelle La Poste par Région (Dakar ≈ 28, Tambacounda ≈ 14, Saint-Louis ≈ 14, Thiès ≈ 13, etc.)
SELECT 
  COALESCE(region, 'Région NULL') as region_name, 
  COUNT(*) as count
FROM public.delivery_points
WHERE provider = 'la_poste'
GROUP BY COALESCE(region, 'Région NULL')
ORDER BY count DESC;
