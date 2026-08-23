-- ============================================================
-- POIDS PRODUIT (grammes) — prérequis factuel pour l'estimation
-- des frais La Poste (Phase F2). Aucune estimation à partir des
-- pages/dimensions/reliure : le poids est soit renseigné (réel),
-- soit NULL (inconnu). Jamais déduit.
-- ============================================================

alter table products
  add column if not exists weight_g integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_weight_g_positive'
      and conrelid = 'products'::regclass
  ) then
    alter table products
      add constraint products_weight_g_positive
      check (weight_g is null or weight_g > 0);
  end if;
end $$;

comment on column products.weight_g is
  'Poids réel de l''ouvrage SEUL (hors emballage d''expédition), en grammes, saisi manuellement en admin. NULL = inconnu (jamais déduit des pages/dimensions/reliure). Utilisé uniquement pour estimer les frais La Poste — n''affecte pas le prix de vente. Le poids d''emballage est ajouté séparément par lib/delivery/postal-pricing.ts.';
