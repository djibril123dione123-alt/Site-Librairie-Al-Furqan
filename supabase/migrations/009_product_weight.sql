-- ============================================================
-- POIDS PRODUIT (grammes) — prérequis factuel pour l'estimation
-- des frais La Poste (Phase F2). Aucune estimation à partir des
-- pages/dimensions/reliure : le poids est soit renseigné (réel),
-- soit NULL (inconnu). Jamais déduit.
-- ============================================================

alter table products
  add column if not exists weight_g integer;

alter table products
  add constraint products_weight_g_positive
  check (weight_g is null or weight_g > 0);

comment on column products.weight_g is
  'Poids réel de l''ouvrage en grammes, saisi manuellement en admin. NULL = inconnu (jamais déduit des pages/dimensions/reliure). Utilisé uniquement pour estimer les frais La Poste — n''affecte pas le prix de vente.';
