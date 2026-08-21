-- ============================================================
-- MANUAL LA POSTE REBUILD SCRIPT — LIBRAIRIE AL FURQAN
-- À COPIER-COLLER DANS LE DASHBOARD SUPABASE (SQL EDITOR)
-- Projet: ryrhopolzmcawscuwcak
-- Généré directement depuis laposte_offices_parsed.json (129 placemarks)
-- ============================================================

BEGIN;

-- 1. Nettoyage ciblé uniquement des bureaux La Poste
DELETE FROM public.delivery_points
WHERE provider = 'la_poste';

-- 2. Insertion transactionnelle autonome des 129 bureaux du dataset source
INSERT INTO public.delivery_points (
  provider,
  name,
  region,
  locality,
  address,
  latitude,
  longitude,
  coordinate_source,
  coordinate_verified,
  source_name,
  source_id,
  source_url,
  is_active,
  verified_at
)
VALUES
  ('la_poste', 'Bargny', 'Dakar', 'Bargny', NULL, 14.6984847, -17.228222499999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Building', 'Dakar', 'Dakar Building', NULL, 14.6635326, -17.4381481, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Etoile', 'Dakar', 'Dakar Etoile', NULL, 14.662022700000001, -17.4371615, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Colobane', 'Dakar', 'Dakar Colobane', NULL, 14.6734519, -17.463249599999997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Fann', 'Dakar', 'Dakar Fann', NULL, 14.690367199999999, -17.464135499999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Grand Yoff', 'Dakar', 'Dakar Grand Yoff', NULL, 14.7328281, -17.456191399999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Liberté', 'Dakar', 'Dakar Liberté', NULL, 14.7228367, -17.442546699999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Ponty', 'Dakar', 'Dakar Ponty', NULL, 14.669591200000001, -17.433232099999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Médina', 'Dakar', 'Dakar Médina', NULL, 14.677690999999998, -17.4583609, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar kermel', 'Dakar', 'Dakar kermel', NULL, 14.670183, -17.429202000000032, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Yoff', 'Dakar', 'Dakar Yoff', NULL, 14.747126299999998, -17.490255599999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Gorée', 'Dakar', 'Gorée', NULL, 14.667859600000002, -17.398928200000004, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Guédiawaye', 'Dakar', 'Guédiawaye', NULL, 14.771971899999999, -17.403935, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Pikine', 'Dakar', 'Pikine', NULL, 14.758944599999998, -17.3937536, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Rufisque', 'Dakar', 'Rufisque', NULL, 14.715539999999999, -17.270929, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Sébikhotane', 'Dakar', 'Sébikhotane', NULL, 14.745074899999999, -17.133682699999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Parcelles Assainies', 'Dakar', 'Parcelles Assainies', NULL, 14.7609131, -17.441067999999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Colis Postaux', 'Dakar', 'Dakar Colis Postaux', NULL, 14.680938099999997, -17.441281, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dakar Peytavin', 'Dakar', 'Dakar Peytavin', NULL, 14.670129599999997, -17.440020099999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'SANGALCAM', 'Dakar', 'SANGALCAM', NULL, 14.778973, -17.2260129, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Keur Massar', 'Dakar', 'Keur Massar', NULL, 14.786367999999998, -17.311941, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'DIAMALAYE', 'Dakar', 'DIAMALAYE', NULL, 14.760816799999999, -17.4540097, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Diourbel', 'Diourbel', 'Diourbel', NULL, 14.6575866, -16.209681, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Fatick', 'Fatick', 'Fatick', NULL, 14.339016700000002, -16.4111425, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Foundiougne', 'Fatick', 'Foundiougne', NULL, 13.81425, -16.4405872, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Gandiaye', 'Fatick', 'Gandiaye', NULL, 14.244536499999999, -16.2728091, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Gossas', 'Fatick', 'Gossas', NULL, 14.495705699999997, -16.0669571, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Guinguinéo', NULL, 'Guinguinéo', NULL, 14.270251, -15.940612799999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Kaffrine', 'Kaffrine', 'Kaffrine', NULL, 14.105202, -15.541575499999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Kaolack Ndorong', 'Kaolack', 'Kaolack Ndorong', NULL, 14.165936199999999, -16.075972699999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Koungheul', 'Kaffrine', 'Koungheul', NULL, 13.980213899999999, -14.801688700000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ndoffane', 'Kaolack', 'Ndoffane', NULL, 13.919217, -15.925927100000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Nioro du Rip', 'Kaolack', 'Nioro du Rip', NULL, 13.6545821, -15.6046064, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Toubacouta', 'Diourbel', 'Toubacouta', NULL, 13.782142299999999, -16.4692997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Sokone', 'Fatick', 'Sokone', NULL, 13.877801199999999, -16.3728707, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Karang', 'Fatick', 'Karang', NULL, 15.1907417, -13.9311654, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Djilor', 'Fatick', 'Djilor', NULL, 14.056634899999999, -16.3353419, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'PALMARIN', 'Fatick', 'PALMARIN', NULL, 14.015725000000002, -16.7647799, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'NIAKHAR', 'Fatick', 'NIAKHAR', NULL, 14.47593, -16.403219, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'DIOUROUP', 'Fatick', 'DIOUROUP', NULL, 14.367465099999999, -16.5260001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Darou Mousty', 'Diourbel', 'Darou Mousty', NULL, 15.043041899999999, -16.0463837, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Guéoul', 'Louga', 'Guéoul', NULL, 15.4777226, -16.343435799999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Kébémer', 'Louga', 'Kébémer', NULL, 15.3763381, -16.4464766, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Linguère', 'Louga', 'Linguère', NULL, 15.3590304, -15.0673313, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Mbacké', 'Diourbel', 'Mbacké', NULL, 14.8038531, -15.905368899999997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ndande', 'Louga', 'Ndande', NULL, 15.276819899999998, -16.5260001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ndoulo', 'Diourbel', 'Ndoulo', NULL, 14.7399018, -16.1095802, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Sagatta', 'Louga', 'Sagatta', NULL, 15.282008899999997, -16.171326699999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Touba', 'Diourbel', 'Touba', NULL, 14.8783818, -15.8947971, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Agnam', 'Matam', 'Agnam', NULL, 16.0062771, -13.691271799999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bokiladji', 'Matam', 'Bokiladji', NULL, 15.0532116, -12.7451163, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dembankané', 'Matam', 'Dembankané', NULL, 15.0898955, -12.7048943, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dondou', 'Matam', 'Dondou', NULL, 16.0200973, -13.384723, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ndouloumadji Dembé', 'Diourbel', 'Ndouloumadji Dembé', NULL, 15.810193, -13.404663999999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Oréfondé', 'Matam', 'Oréfondé', NULL, 16.044266300000004, -13.726020499999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Semmé', 'Matam', 'Semmé', NULL, 15.2008428, -12.9449928, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Sinthiou Bamambé', 'Matam', 'Sinthiou Bamambé', NULL, 15.368808299999998, -13.1365521, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Thilogne', 'Matam', 'Thilogne', NULL, 15.9650839, -13.594313, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Waoundé', 'Matam', 'Waoundé', NULL, 15.269976699999999, -12.8658649, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Wodobéré', 'Matam', 'Wodobéré', NULL, 15.560325800000001, -13.101962900000002, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Nguidjilone', 'Matam', 'Nguidjilone', NULL, 15.9373269, -13.3515091, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Matam', 'Matam', 'Matam', NULL, 15.660022499999998, -13.2576906, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ranerou', 'Matam', 'Ranerou', NULL, 15.295427799999997, -13.957908000000002, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Orkadiéré', 'Matam', 'Orkadiéré', NULL, 15.281488399999997, -12.963703299999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Saint Louis Sor', NULL, 'Saint Louis Sor', NULL, 16.029943, -16.471453, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Aéré Lao', 'Saint-Louis', 'Aéré Lao', NULL, 16.4008376, -14.323917999999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Golleré', 'Saint-Louis', 'Golleré', NULL, 16.2488504, -14.108844999999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Mboumba', 'Saint-Louis', 'Mboumba', NULL, 16.19148, -14.021745999999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ndioum', 'Saint-Louis', 'Ndioum', NULL, 16.5101114, -14.650037099999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Podor', 'Saint-Louis', 'Podor', NULL, 16.5258829, -15.2224062, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Thillé Boubacar', 'Saint-Louis', 'Thillé Boubacar', NULL, 16.5168558, -15.092276300000002, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Richard –Toll', 'Saint-Louis', 'Richard –Toll', NULL, 16.4588779, -15.694045399999997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ross Béthio', 'Saint-Louis', 'Ross Béthio', NULL, 16.2774313, -16.1389809, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Rosso Sénégal', 'Saint-Louis', 'Rosso Sénégal', NULL, 16.5163413, -15.802612, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Gamadji Sare', 'Saint-Louis', 'Gamadji Sare', NULL, 16.51856, -14.712721100000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Niandane', 'Saint-Louis', 'Niandane', NULL, 16.593767, -14.990979999999997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Khombole', 'Thiès', 'Khombole', NULL, 14.767387200000002, -16.685136, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Mbour', 'Thiès', 'Mbour', NULL, 14.4452338, -17.0183614, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Mékhé', 'Thiès', 'Mékhé', NULL, 15.115983000000002, -16.6320777, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ndiaganiao', 'Thiès', 'Ndiaganiao', NULL, 14.538845499999997, -16.7264125, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Pékesse', 'Thiès', 'Pékesse', NULL, 15.11376, -16.415559, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Popenguine', 'Thiès', 'Popenguine', NULL, 14.556799499999999, -17.1115302, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Thiadiaye', 'Thiès', 'Thiadiaye', NULL, 14.422314899999998, -16.702825, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Thilmakha', 'Thiès', 'Thilmakha', NULL, 15.037911200000002, -16.2536853, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Tivaouane', 'Thiès', 'Tivaouane', NULL, 14.9526715, -16.8119382, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bambey', 'Diourbel', 'Bambey', NULL, 14.6965115, -16.458256, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Saly', 'Thiès', 'Saly', NULL, 14.443593000000002, -16.9889904, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Goudiry', 'Tambacounda', 'Goudiry', NULL, 14.185873299999999, -12.7163849, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Kidira', 'Tambacounda', 'Kidira', NULL, 14.458111599999999, -12.211882399999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Koumpentoum', 'Tambacounda', 'Koumpentoum', NULL, 13.9779361, -14.562614, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Koussanar', 'Tambacounda', 'Koussanar', NULL, 13.8679162, -14.0827096, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Tambacounda', 'Tambacounda', 'Tambacounda', NULL, 13.7725888, -13.671005899999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Moudéry', 'Tambacounda', 'Moudéry', NULL, 15.056726000000001, -12.591721, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Yaféra', 'Tambacounda', 'Yaféra', NULL, 14.774572, -12.2939589, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Médina Gounass', 'Tambacounda', 'Médina Gounass', NULL, 13.146616999999999, -13.752087999999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Missirah', 'Tambacounda', 'Missirah', NULL, 13.68042, -16.501279999999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Aroundou', 'Tambacounda', 'Aroundou', NULL, 14.758861999999999, -12.2514559, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Salemata', 'Kédougou', 'Salemata', NULL, 12.634195799999999, -12.819851, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bignona', 'Ziguinchor', 'Bignona', NULL, 12.8050911, -16.234563299999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bounkiling', 'Sédhiou', 'Bounkiling', NULL, 13.039623599999999, -15.694045399999997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Cabrousse', 'Ziguinchor', 'Cabrousse', NULL, 12.3505299, -16.716631, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Diouloulou', 'Ziguinchor', 'Diouloulou', NULL, 13.0459566, -16.6026064, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Dianah-Malary', 'Sédhiou', 'Dianah-Malary', NULL, 12.847277, -15.252158999999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Kolda', 'Kolda', 'Kolda', NULL, 12.9107495, -14.950567099999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Marsassoum', 'Sédhiou', 'Marsassoum', NULL, 12.836481, -15.977332200000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Oussouye', 'Ziguinchor', 'Oussouye', NULL, 12.488448499999999, -16.543675999999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Sédhiou', 'Sédhiou', 'Sédhiou', NULL, 12.704604000000002, -15.556230399999997, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Tanaff', 'Sédhiou', 'Tanaff', NULL, 12.653870399999999, -15.4243804, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Vélingara', 'Kolda', 'Vélingara', NULL, 13.1440754, -14.105940799999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ziguinchor Escale', 'Ziguinchor', 'Ziguinchor Escale', NULL, 12.5873101, -16.270723699999998, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Thionk-Essyl', 'Ziguinchor', 'Thionk-Essyl', NULL, 12.7879089, -16.50538, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Diaobe', 'Kolda', 'Diaobe', NULL, 12.9133385, -14.161130199999999, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Sindia', 'Thiès', 'Sindia', NULL, 14.5889351, -17.039179800000056, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Adéane', 'Ziguinchor', 'Adéane', NULL, 12.6267874, -16.0140586, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Elinkine', 'Ziguinchor', 'Elinkine', NULL, 12.5072598, -16.6630268, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Medina yorofoula', 'Kolda', 'Medina yorofoula', NULL, 13.28891, -14.714350000000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Médina Mary', 'Kolda', 'Médina Mary', NULL, 13.180764799999999, -14.2932665, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Ouakam', 'Dakar', 'Ouakam', NULL, 14.7237121, -17.49423330000002, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Poste Thiaroye', 'Dakar', 'Poste Thiaroye', NULL, 14.7461145, -17.376603299999942, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'HLM', 'Dakar', 'HLM', NULL, 14.7001174, -17.44550419999996, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Nafa VDN', 'Dakar', 'Nafa VDN', NULL, 14.7248496, -17.471914800000036, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau de Poste de Yenne', 'Dakar', 'Bureau de Poste de Yenne', NULL, 14.6926948, -17.2080647, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau de Poste Zac Mbao', 'Dakar', 'Bureau de Poste Zac Mbao', NULL, 14.7427705, -17.34279360000005, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau Poste Mpal', 'Saint-Louis', 'Bureau Poste Mpal', NULL, 15.9212665, -16.266924700000004, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau Gabou Tambacouda', 'Tambacounda', 'Bureau Gabou Tambacouda', NULL, 14.71642, -12.412268199999971, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau Poste Birkelane', 'Kaffrine', 'Bureau Poste Birkelane', NULL, 14.128458, -15.743919399999982, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau Poste Diofior', 'Fatick', 'Bureau Poste Diofior', NULL, 14.1864516, -16.65860520000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureau de Diofior', 'Fatick', 'Bureau de Diofior', NULL, 14.1864516, -16.65860520000001, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW()),
  ('la_poste', 'Bureaux de Poste de Kaolack', 'Kaolack', 'Bureaux de Poste de Kaolack', NULL, 14.1923567, -16.0714051, 'official_google_mymaps', true, 'La Poste Sénégal', NULL, 'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT', true, NOW());

-- 3. Garde-fous transactionnels PL/pgSQL
DO $$
DECLARE
  v_count INTEGER;
  v_gps_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.delivery_points WHERE provider = 'la_poste';
  IF v_count <> 129 THEN
    RAISE EXCEPTION 'ERREUR TRANSACTIONNELLE: Le nombre total de bureaux La Poste (%) ne correspond pas aux 129 attendus.', v_count;
  END IF;

  SELECT COUNT(*) INTO v_gps_count FROM public.delivery_points WHERE provider = 'la_poste' AND latitude IS NOT NULL AND longitude IS NOT NULL;
  IF v_gps_count <> 129 THEN
    RAISE EXCEPTION 'ERREUR TRANSACTIONNELLE: Le nombre de bureaux La Poste avec GPS (%) ne correspond pas aux 129 attendus.', v_gps_count;
  END IF;
END $$;

COMMIT;

-- 4. Notification rechargement cache PostgREST
NOTIFY pgrst, 'reload schema';

-- 5. Requêtes de vérification après COMMIT
SELECT COUNT(*) as total_laposte FROM public.delivery_points WHERE provider = 'la_poste';
SELECT COUNT(*) as total_gps FROM public.delivery_points WHERE provider = 'la_poste' AND latitude IS NOT NULL AND longitude IS NOT NULL;
SELECT COUNT(*) as total_source_name FROM public.delivery_points WHERE provider = 'la_poste' AND source_name = 'La Poste Sénégal';
SELECT COUNT(*) as total_region_null FROM public.delivery_points WHERE provider = 'la_poste' AND region IS NULL;

SELECT 
  COALESCE(region, 'Région NULL') as region_name, 
  COUNT(*) as total
FROM public.delivery_points
WHERE provider = 'la_poste'
GROUP BY region
ORDER BY total DESC;
