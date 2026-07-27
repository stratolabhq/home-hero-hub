/**
 * Live count helpers for the curated (is_popular) beginner surface. Routes
 * every count through applyPopularFilter so "curated" stays defined in one
 * place — see popular-filter.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { applyPopularFilter } from './popular-filter';

export async function getCuratedTotal(supabase: SupabaseClient): Promise<number> {
  const query = supabase.from('products').select('*', { count: 'exact', head: true });
  const { count } = await applyPopularFilter(query, true);
  return count ?? 0;
}

export async function getCuratedCategoryCounts(supabase: SupabaseClient): Promise<Record<string, number>> {
  const query = supabase.from('products').select('category');
  const { data } = await applyPopularFilter(query, true);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}
