-- ============================================================
-- RECADRAGE NON-DESTRUCTIF DES COUVERTURES (Phase L)
--
-- storage_path reste le fichier AFFICHÉ (couverture actuelle telle
-- qu'utilisée par la boutique) — comportement inchangé pour toute
-- ligne existante.
--
-- original_storage_path pointe vers le fichier ORIGINAL jamais
-- retouché. NULL tant qu'aucun recadrage n'a jamais été appliqué —
-- dans ce cas storage_path EST l'original (pas de réécriture des
-- lignes existantes à cette migration, voir Phase L §13).
--
-- crop_data conserve les paramètres du recadrage (rectangle exprimé
-- en pixels de l'image ORIGINALE, zoom, etc.) pour pouvoir rouvrir
-- l'éditeur et corriger le recadrage sans repartir de zéro. NULL
-- tant qu'aucun recadrage n'existe.
-- ============================================================

alter table product_images
  add column if not exists original_storage_path text,
  add column if not exists crop_data jsonb;

comment on column product_images.original_storage_path is
  'Chemin de stockage du fichier ORIGINAL jamais retouché. NULL = aucun recadrage appliqué (storage_path EST alors l''original). Ne jamais réécrire ni supprimer ce fichier tant qu''un recadrage peut vouloir y revenir.';

comment on column product_images.crop_data is
  'Paramètres du recadrage actuellement appliqué (rectangle en pixels de l''image originale, zoom), permettant de rouvrir l''éditeur avec l''état exact précédent. NULL = aucun recadrage appliqué.';
