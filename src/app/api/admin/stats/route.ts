import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.email !== process.env.ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [devicesRes, pendingRes, userProductsRes, usersRes, genLogsRes] = await Promise.all([
    admin.from('products').select('*', { count: 'exact', head: true }),
    admin.from('device_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('user_products').select('*', { count: 'exact', head: true }),
    admin.auth.admin.listUsers({ perPage: 1 }),
    admin.from('generation_logs').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
  ]);

  // Recent device requests
  const { data: recentRequests } = await admin
    .from('device_requests')
    .select('id, device_name, brand, status, created_at, votes')
    .order('created_at', { ascending: false })
    .limit(5);

  // Recent import logs
  const { data: recentImports } = await admin
    .from('import_logs')
    .select('id, run_at, trigger, status, products_imported')
    .order('run_at', { ascending: false })
    .limit(3);

  return NextResponse.json({
    totalDevices: devicesRes.count ?? 0,
    pendingRequests: pendingRes.count ?? 0,
    totalUserProducts: userProductsRes.count ?? 0,
    totalUsers: ('total' in (usersRes.data ?? {}) ? (usersRes.data as { total: number }).total : usersRes.data?.users.length) ?? 0,
    generationsThisWeek: genLogsRes.count ?? 0,
    recentRequests: recentRequests ?? [],
    recentImports: recentImports ?? [],
  });
}
