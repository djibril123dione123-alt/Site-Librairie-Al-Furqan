import type { SupabaseClient } from '@supabase/supabase-js';
import type { CartLine } from '@/components/providers';
import { getLineKey, getVariantId } from '@/lib/cart/identity';
import { isValidUuid } from '@/lib/utils/uuid';

const MAX_QUANTITY = 999;

/**
 * Phase H already had malformed-cart-identifier concerns. A guest's
 * localStorage row must not poison an entire account sync — anything that
 * isn't a real product id / valid positive integer quantity is dropped
 * before it ever reaches the cloud tables. Never invented, never guessed.
 *
 * Phase J.2: productId/variantId also have to be valid UUIDs, not just
 * non-empty strings — customer_cart_items.product_id/variant_id are UUID
 * columns, so a row like productId:"banana" previously passed this check
 * and then failed the entire Supabase upsert, taking every OTHER valid
 * line down with it.
 */
export function sanitizeCartLines(cart: CartLine[]): { valid: CartLine[]; ignoredCount: number } {
  const valid: CartLine[] = [];
  let ignoredCount = 0;
  for (const line of cart) {
    const hasValidProductId = isValidUuid(line.productId);
    const variantId = getVariantId(line);
    const hasValidVariantId = variantId === undefined || isValidUuid(variantId);
    const qty = Number(line.quantity);
    const hasValidQuantity = Number.isInteger(qty) && qty > 0 && qty <= MAX_QUANTITY;
    if (!hasValidProductId || !hasValidVariantId || !hasValidQuantity) {
      ignoredCount++;
      continue;
    }
    valid.push({ ...line, quantity: qty });
  }
  return { valid, ignoredCount };
}

/** Same reasoning as sanitizeCartLines, for customer_wishlist_items.product_id. */
export function sanitizeWishlistIds(ids: Set<string>): { valid: string[]; ignoredCount: number } {
  const valid: string[] = [];
  let ignoredCount = 0;
  Array.from(ids).forEach((id) => {
    if (isValidUuid(id)) {
      valid.push(id);
    } else {
      ignoredCount++;
    }
  });
  return { valid, ignoredCount };
}

/**
 * MAX(localQuantity, cloudQuantity) per matching line, union for lines that
 * only exist on one side. Deliberately never SUM — merge must be
 * idempotent, and a repeated login must never compound quantities.
 * Variant identity (product + variant) keeps distinct variants distinct.
 */
export function mergeCartLines(guestCart: CartLine[], cloudCart: CartLine[]): CartLine[] {
  const byKey = new Map<string, CartLine>();
  for (const line of guestCart) {
    byKey.set(getLineKey(line), line);
  }
  for (const cloudLine of cloudCart) {
    const key = getLineKey(cloudLine);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, cloudLine);
    } else if (cloudLine.quantity > existing.quantity) {
      byKey.set(key, { ...existing, quantity: cloudLine.quantity });
    }
  }
  return Array.from(byKey.values());
}

export function mergeWishlists(guest: Set<string>, cloud: Set<string>): Set<string> {
  return new Set([...Array.from(guest), ...Array.from(cloud)]);
}

/**
 * A failed read must never be silently treated as "the account has nothing".
 * The initial sign-in merge has to tell these apart — {ok:true, data:[]} is
 * a genuinely empty account (safe to merge/write); {ok:false} is a network/
 * RLS/query failure (must not touch guest state at all). The raw Postgrest
 * error is captured for logging but never meant for customer-facing text.
 */
export type CloudReadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchCloudCart(supabase: SupabaseClient, userId: string): Promise<CloudReadResult<CartLine[]>> {
  const { data, error } = await supabase
    .from('customer_cart_items')
    .select('product_id, variant_id, quantity')
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((row: any) => ({
      productId: row.product_id,
      variantId: row.variant_id ?? undefined,
      quantity: row.quantity,
    })),
  };
}

export async function fetchCloudWishlist(supabase: SupabaseClient, userId: string): Promise<CloudReadResult<Set<string>>> {
  const { data, error } = await supabase
    .from('customer_wishlist_items')
    .select('product_id')
    .eq('user_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: new Set((data ?? []).map((row: any) => row.product_id as string)) };
}

/**
 * Replaces the account's entire cloud cart with `cart` in one pass: upsert
 * every current line (idempotent), delete anything previously known that
 * is no longer present. `previousKeys` is the caller's own record of what
 * it last believed was in the cloud — passing it avoids an extra read.
 */
export async function reconcileCloudCart(
  supabase: SupabaseClient,
  userId: string,
  cart: CartLine[],
  previousKeys: Set<string>
): Promise<{ ok: boolean; syncedKeys: Set<string> }> {
  const { valid } = sanitizeCartLines(cart);
  const currentKeys = new Set(valid.map(getLineKey));

  const rows = valid.map((line) => ({
    user_id: userId,
    line_key: getLineKey(line),
    product_id: line.productId,
    variant_id: getVariantId(line) ?? null,
    quantity: line.quantity,
  }));

  let ok = true;

  if (rows.length > 0) {
    const { error } = await supabase.from('customer_cart_items').upsert(rows, { onConflict: 'user_id,line_key' });
    if (error) ok = false;
  }

  const removedKeys = Array.from(previousKeys).filter((key) => !currentKeys.has(key));
  if (ok && removedKeys.length > 0) {
    const { error } = await supabase
      .from('customer_cart_items')
      .delete()
      .eq('user_id', userId)
      .in('line_key', removedKeys);
    if (error) ok = false;
  }

  return { ok, syncedKeys: ok ? currentKeys : previousKeys };
}

export async function reconcileCloudWishlist(
  supabase: SupabaseClient,
  userId: string,
  wishlist: Set<string>,
  previousIds: Set<string>
): Promise<{ ok: boolean; syncedIds: Set<string> }> {
  let ok = true;
  // Same reasoning as reconcileCloudCart: bookkeeping (currentIds, and the
  // syncedIds this returns) tracks only the sanitized set, so a malformed
  // id never gets uploaded, never poisons a valid id's upsert, and is
  // simply never considered "synced" — it stays quarantined in memory
  // without being retried every time or blocking anything else.
  const { valid } = sanitizeWishlistIds(wishlist);
  const currentIds = new Set(valid);

  const toAdd = Array.from(currentIds).filter((id) => !previousIds.has(id));
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('customer_wishlist_items')
      .upsert(toAdd.map((product_id) => ({ user_id: userId, product_id })), { onConflict: 'user_id,product_id' });
    if (error) ok = false;
  }

  const toRemove = Array.from(previousIds).filter((id) => !currentIds.has(id));
  if (ok && toRemove.length > 0) {
    const { error } = await supabase
      .from('customer_wishlist_items')
      .delete()
      .eq('user_id', userId)
      .in('product_id', toRemove);
    if (error) ok = false;
  }

  return { ok, syncedIds: ok ? new Set(currentIds) : previousIds };
}

export type DeliveryPreference = {
  preferredDeliveryMethod: 'standard' | 'la_poste' | null;
  region: string | null;
  department: string | null;
  commune: string | null;
  locality: string | null;
  localityId: string | null;
  isCustomLocality: boolean;
  preferredPostOfficeId: string | null;
  preferredCustomOfficeName: string | null;
};

export type ContactPreference = {
  rememberContactDetails: boolean;
  contactName: string | null;
  contactPhone: string | null;
  quartier: string | null;
  repere: string | null;
};

export type CustomerPreferences = DeliveryPreference & ContactPreference;

export async function fetchCustomerPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<CustomerPreferences | null> {
  const { data, error } = await supabase
    .from('customer_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    preferredDeliveryMethod: data.preferred_delivery_method,
    region: data.region,
    department: data.department,
    commune: data.commune,
    locality: data.locality,
    localityId: data.locality_id,
    isCustomLocality: !!data.is_custom_locality,
    preferredPostOfficeId: data.preferred_post_office_id,
    preferredCustomOfficeName: data.preferred_custom_office_name,
    rememberContactDetails: !!data.remember_contact_details,
    contactName: data.contact_name,
    contactPhone: data.contact_phone,
    quartier: data.quartier,
    repere: data.repere,
  };
}

export async function saveDeliveryPreference(
  supabase: SupabaseClient,
  userId: string,
  pref: DeliveryPreference
): Promise<boolean> {
  const { error } = await supabase.from('customer_preferences').upsert(
    {
      user_id: userId,
      preferred_delivery_method: pref.preferredDeliveryMethod,
      region: pref.region,
      department: pref.department,
      commune: pref.commune,
      locality: pref.locality,
      locality_id: pref.localityId,
      is_custom_locality: pref.isCustomLocality,
      preferred_post_office_id: pref.preferredPostOfficeId,
      preferred_custom_office_name: pref.preferredCustomOfficeName,
    },
    { onConflict: 'user_id' }
  );
  return !error;
}

export async function saveContactPreference(
  supabase: SupabaseClient,
  userId: string,
  contact: ContactPreference
): Promise<boolean> {
  const { error } = await supabase.from('customer_preferences').upsert(
    {
      user_id: userId,
      remember_contact_details: contact.rememberContactDetails,
      contact_name: contact.rememberContactDetails ? contact.contactName : null,
      contact_phone: contact.rememberContactDetails ? contact.contactPhone : null,
      quartier: contact.quartier,
      repere: contact.repere,
    },
    { onConflict: 'user_id' }
  );
  return !error;
}

export async function clearDeliveryPreference(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('customer_preferences')
    .update({
      preferred_delivery_method: null,
      region: null,
      department: null,
      commune: null,
      locality: null,
      locality_id: null,
      is_custom_locality: false,
      preferred_post_office_id: null,
      preferred_custom_office_name: null,
    })
    .eq('user_id', userId);
  return !error;
}

export async function clearContactPreference(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('customer_preferences')
    .update({
      remember_contact_details: false,
      contact_name: null,
      contact_phone: null,
      // quartier/repere are only ever written alongside contact details
      // (saveContactPreference, gated by the same consent checkbox) — they
      // must be cleared from the same place or a stale quartier could
      // silently prefill an unrelated future address.
      quartier: null,
      repere: null,
    })
    .eq('user_id', userId);
  return !error;
}

/**
 * A saved office id is convenience data, not truth — re-fetch the current
 * row rather than trusting whatever was stored, and treat a missing/
 * inactive office as "no saved office" rather than blocking anything.
 */
export async function resolveSavedPostOffice(supabase: SupabaseClient, officeId: string) {
  const { data, error } = await supabase
    .from('delivery_points')
    .select('id, name, address, region, locality, latitude, longitude')
    .eq('id', officeId)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
