'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: string;
  tier: 'free' | 'premium';
}

export default function RateLimitDisplay() {
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      fetchLimitInfo(session.access_token);
    });
  }, []);

  const fetchLimitInfo = async (token: string) => {
    try {
      const res = await fetch('/api/check-limit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLimitInfo(await res.json());
    } catch {
      // Non-fatal — widget just won't show
    } finally {
      setLoading(false);
    }
  };

  if (loading || !limitInfo) return null;

  const resetDate = new Date(limitInfo.resetDate);
  const hoursUntilReset = Math.max(1, Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60)));
  const pct = limitInfo.limit > 0 ? ((limitInfo.limit - limitInfo.remaining) / limitInfo.limit) * 100 : 0;
  const nearLimit = limitInfo.remaining <= 1;

  return (
    <div className={`rounded-lg p-4 mb-4 border ${nearLimit ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${nearLimit ? 'text-red-900' : 'text-gray-900'}`}>
            {limitInfo.remaining === 0
              ? 'Daily limit reached'
              : `${limitInfo.remaining} of ${limitInfo.limit} generations remaining`}
          </p>
          <p className={`text-xs mt-0.5 ${nearLimit ? 'text-red-700' : 'text-gray-600'}`}>
            Resets in {hoursUntilReset} hour{hoursUntilReset !== 1 ? 's' : ''}
          </p>
          {/* Usage bar */}
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${nearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {limitInfo.tier === 'free' && (
          <a
            href="/premium"
            className="flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Upgrade →
          </a>
        )}
      </div>
    </div>
  );
}
