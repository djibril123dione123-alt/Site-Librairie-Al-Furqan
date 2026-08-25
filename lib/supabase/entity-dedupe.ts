import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Exact-name duplicate guard for author/publisher "quick create" flows.
 *
 * Deliberately narrow: only trim + case are normalized, per Phase L §28 —
 * accent differences ("Al Hadith" vs "Al-Hadîth") and transliteration
 * variants are real ambiguity the operator must resolve by hand, not
 * something this check should silently collapse. `ilike` with no wildcards
 * in the pattern is a case-insensitive *exact* match; `%`/`_` are escaped
 * so a name containing them can't accidentally turn into a pattern.
 */
export async function findExistingByExactName(
  supabase: SupabaseClient,
  table: 'authors' | 'publishers',
  name: string
): Promise<{ id: string; name: string } | null> {
  const trimmed = name.trim();
  const escaped = trimmed.replace(/[%_]/g, (m) => `\\${m}`);
  const { data } = await supabase
    .from(table)
    .select('id, name')
    .ilike('name', escaped)
    .limit(1)
    .maybeSingle();
  return data || null;
}

function generateEntitySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Same exact-name-reuse-or-create logic as the dedicated authors/publishers
 * quick-create endpoints, for the inline "type a name, resolve or create"
 * path used when saving a product directly (ProductForm's plain text
 * input, not the "+ Créer auteur/éditeur" modal). Kept here so both paths
 * can't drift back into two different duplicate-creation bugs.
 */
export async function resolveOrCreateEntityId(
  supabase: SupabaseClient,
  table: 'authors' | 'publishers',
  name: string
): Promise<string | null> {
  const existing = await findExistingByExactName(supabase, table, name);
  if (existing) return existing.id;

  const slug = generateEntitySlug(name);
  const { data, error } = await supabase.from(table).insert({ name, slug } as any).select('id').single();
  if (!error) return data?.id || null;

  if (error.code === '23505') {
    const winner = await findExistingByExactName(supabase, table, name);
    if (winner) return winner.id;
  }
  return null;
}
