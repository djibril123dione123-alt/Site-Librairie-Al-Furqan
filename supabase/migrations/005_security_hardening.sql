-- ============================================================
-- Migration 005 : Security Hardening (Supabase Advisor)
-- ============================================================

-- 1. Fix search_path mutable warning
-- Spécifier explicitement le search_path pour les fonctions Security Definer (et les triggers)
-- Cela prévient les attaques par modification du search_path.
alter function public.handle_new_user() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.is_admin() set search_path = public;

-- 2. Revoke EXECUTE sur les fonctions qui n'ont pas besoin d'être appelées par RPC
-- handle_new_user est appelé par un trigger Supabase Auth (rôle postgres/supabase_admin), 
-- le public n'a pas besoin de l'exécuter.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- set_updated_at est un trigger, pas besoin de RPC
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon, authenticated;

-- NOTE : Nous NE révoquons PAS l'exécution de is_admin() pour anon/authenticated, 
-- car cette fonction DOIT être exécutable par l'utilisateur courant pour évaluer les policies RLS.
-- La sécurisation par `set search_path` est suffisante pour le Security Definer ici.

-- 3. Ajouter les policies manquantes sur 'audiences'
drop policy if exists "audiences_public_read" on audiences;
create policy "audiences_public_read" on audiences for select using (true);

drop policy if exists "audiences_admin_all" on audiences;
create policy "audiences_admin_all" on audiences for all using (public.is_admin());

-- 4. Déplacer unaccent vers le schéma extensions (bonne pratique Supabase)
-- Cela le retire du schéma public et évite les pollutions d'API.
create schema if not exists extensions;
alter extension unaccent set schema extensions;
