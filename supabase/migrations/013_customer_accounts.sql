BEGIN;

-- ============================================================
-- 013_customer_accounts.sql
-- Phase J — optional customer accounts: cloud cart, wishlist and
-- delivery/contact preferences for authenticated customers.
--
-- Deliberately separate from `profiles` (Admin role table, 001_schema.sql):
-- profiles.role stays an Admin-only concern. Every new auth user already
-- gets a profiles row with role='viewer' via the existing on_auth_user_created
-- trigger — that is untouched here and is sufficient to identify "a Magic
-- Link customer signed up" without overloading the Admin table with
-- commerce data.
--
-- These tables store INTENT only (product id, variant id, quantity — never
-- a price or stock snapshot). The live product/variant resolver
-- (lib/cart/resolve-cart.ts) remains the sole source of truth for price,
-- stock and availability; a row here surviving after a product is archived
-- or deleted is expected and handled by that resolver (PRODUCT_REMOVED /
-- VARIANT_REMOVED), which is also why product_id/variant_id cascade on
-- delete instead of blocking it.
-- ============================================================

-- ============================================================
-- 1. customer_cart_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_cart_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- productId, or productId:variantId when a variant is selected — mirrors
  -- the client's own line identity (components/providers.tsx CartLine) so
  -- a base product and each of its variants are always distinct lines.
  line_key text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 999),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, line_key)
);

DROP TRIGGER IF EXISTS customer_cart_items_updated_at ON public.customer_cart_items;
CREATE TRIGGER customer_cart_items_updated_at
  BEFORE UPDATE ON public.customer_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. customer_wishlist_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_wishlist_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- ============================================================
-- 3. customer_preferences (one row per customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  preferred_delivery_method text CHECK (preferred_delivery_method IN ('standard', 'la_poste')),

  region text,
  department text,
  commune text,
  locality text,
  -- Nullable on purpose: a customer may have used "Je ne trouve pas ma
  -- localité" (is_custom_locality=true), in which case there is no real
  -- ANSD row and none must be fabricated (Phase H/I geography rule).
  locality_id uuid REFERENCES public.senegal_locations(id) ON DELETE SET NULL,
  is_custom_locality boolean NOT NULL DEFAULT false,

  preferred_post_office_id uuid REFERENCES public.delivery_points(id) ON DELETE SET NULL,
  preferred_custom_office_name text,

  -- Contact details are more personal than a geographic preference, so
  -- they are only ever written when the customer explicitly opts in
  -- (remember_contact_details) — see the delivery page's checkbox.
  remember_contact_details boolean NOT NULL DEFAULT false,
  contact_name text,
  contact_phone text,

  quartier text,
  repere text,

  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS customer_preferences_updated_at ON public.customer_preferences;
CREATE TRIGGER customer_preferences_updated_at
  BEFORE UPDATE ON public.customer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS — authenticated users may only ever touch their own rows.
-- Anon gets no policy at all on any of these three tables, which under
-- RLS means zero rows, zero access — the same proven pattern already
-- used for search_events/book_requests (public INSERT allowed, SELECT
-- restricted) elsewhere in this schema. auth.uid() is wrapped in a
-- subselect per the 006_security_final.sql RLS performance convention.
-- ============================================================
ALTER TABLE public.customer_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_cart_items_own_all" ON public.customer_cart_items;
CREATE POLICY "customer_cart_items_own_all" ON public.customer_cart_items
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "customer_wishlist_items_own_all" ON public.customer_wishlist_items;
CREATE POLICY "customer_wishlist_items_own_all" ON public.customer_wishlist_items
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "customer_preferences_own_all" ON public.customer_preferences;
CREATE POLICY "customer_preferences_own_all" ON public.customer_preferences
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

COMMIT;
