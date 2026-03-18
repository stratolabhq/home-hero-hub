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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    devicesRes,
    userProductsRes,
    requestsRes,
    usersRes,
  ] = await Promise.all([
    admin.from('products').select('id, name, brand, category'),
    admin.from('user_products').select('product_id'),
    admin.from('device_requests').select('brand, category, status, created_at, votes'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Most popular devices (most added to inventories)
  const productCountMap: Record<string, number> = {};
  for (const row of userProductsRes.data ?? []) {
    productCountMap[row.product_id] = (productCountMap[row.product_id] ?? 0) + 1;
  }
  const popularDevices = (devicesRes.data ?? [])
    .map(d => ({ ...d, add_count: productCountMap[d.id] ?? 0 }))
    .filter(d => d.add_count > 0)
    .sort((a, b) => b.add_count - a.add_count)
    .slice(0, 10);

  // Top requested brands
  const brandMap: Record<string, number> = {};
  for (const r of requestsRes.data ?? []) {
    if (r.brand) brandMap[r.brand] = (brandMap[r.brand] ?? 0) + 1;
  }
  const topBrands = Object.entries(brandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([brand, count]) => ({ brand, count }));

  // Top requested categories
  const catMap: Record<string, number> = {};
  for (const r of requestsRes.data ?? []) {
    if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + 1;
  }
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  // User sign-ups per day (last 30 days)
  const signupsByDay: Record<string, number> = {};
  for (const u of usersRes.data?.users ?? []) {
    if (!u.created_at) continue;
    const date = u.created_at.split('T')[0];
    if (date >= thirtyDaysAgo.split('T')[0]) {
      signupsByDay[date] = (signupsByDay[date] ?? 0) + 1;
    }
  }
  // Fill in missing days with 0
  const signupGraph: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    signupGraph.push({ date: dateStr, count: signupsByDay[dateStr] ?? 0 });
  }

  // Request status breakdown
  const statusMap: Record<string, number> = {};
  for (const r of requestsRes.data ?? []) {
    statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
  }

  return NextResponse.json({
    totalDevices: devicesRes.data?.length ?? 0,
    totalUsers: ('total' in (usersRes.data ?? {}) ? (usersRes.data as { total: number }).total : usersRes.data?.users.length) ?? 0,
    totalUserProducts: userProductsRes.data?.length ?? 0,
    popularDevices,
    topBrands,
    topCategories,
    signupGraph,
    requestStatusBreakdown: statusMap,
  });
}
