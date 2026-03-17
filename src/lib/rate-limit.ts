import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const FREE_TIER_LIMIT = 5;
export const PREMIUM_TIER_LIMIT = 100;

export interface LimitInfo {
  allowed: boolean;
  remaining: number;
  count: number;
  limit: number;
  resetDate: string;
  tier: 'free' | 'premium';
}

/** Returns midnight tonight (UTC) as a reset boundary. */
function nextResetDate(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

/**
 * Check (and lazily initialise) a user's daily generation limit.
 * Uses the service-role client so it can bypass RLS on writes.
 */
export async function checkRateLimit(userId: string): Promise<LimitInfo> {
  const serviceClient: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const resetDate = nextResetDate();

  // Fetch existing row
  const { data, error } = await serviceClient
    .from('generation_limits')
    .select('count, reset_date, tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Rate limit DB error: ${error.message}`);

  // First-time user: create their row
  if (!data) {
    await serviceClient.from('generation_limits').insert({
      user_id: userId,
      count: 0,
      reset_date: resetDate.toISOString(),
      tier: 'free',
    });
    return { allowed: true, remaining: FREE_TIER_LIMIT, count: 0, limit: FREE_TIER_LIMIT, resetDate: resetDate.toISOString(), tier: 'free' };
  }

  // Reset count if the day boundary has passed
  let { count, tier } = data;
  const dbResetDate = new Date(data.reset_date);

  if (dbResetDate < now) {
    count = 0;
    await serviceClient
      .from('generation_limits')
      .update({ count: 0, reset_date: resetDate.toISOString() })
      .eq('user_id', userId);
  }

  const limit = tier === 'premium' ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count);
  const effectiveReset = dbResetDate < now ? resetDate.toISOString() : data.reset_date;

  return { allowed, remaining, count, limit, resetDate: effectiveReset, tier: tier as 'free' | 'premium' };
}

/**
 * Atomically increment the user's generation count.
 * Calls the DB-side function defined in 003_yaml_security.sql.
 */
export async function incrementGenerationCount(userId: string): Promise<void> {
  const serviceClient: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await serviceClient.rpc('increment_generation_count', { p_user_id: userId });
}

/**
 * Write a generation audit entry.
 */
export async function logGeneration(entry: {
  userId: string | null;
  prompt: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
}): Promise<void> {
  const serviceClient: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await serviceClient.from('generation_logs').insert({
    user_id: entry.userId,
    prompt: entry.prompt.slice(0, 500),
    success: entry.success,
    error_message: entry.errorMessage ?? null,
    ip_address: entry.ipAddress ?? null,
  });
}
