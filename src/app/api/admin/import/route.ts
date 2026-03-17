import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runImport } from '@/lib/import-service';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  // Validate admin session
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate required env vars
  const missing: string[] = [];
  if (!process.env.AMAZON_PA_ACCESS_KEY) missing.push('AMAZON_PA_ACCESS_KEY');
  if (!process.env.AMAZON_PA_SECRET_KEY) missing.push('AMAZON_PA_SECRET_KEY');
  if (!process.env.AMAZON_PA_PARTNER_TAG) missing.push('AMAZON_PA_PARTNER_TAG');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing environment variables: ${missing.join(', ')}` },
      { status: 500 }
    );
  }

  try {
    const result = await runImport(
      'manual',
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      process.env.AMAZON_PA_ACCESS_KEY!,
      process.env.AMAZON_PA_SECRET_KEY!,
      process.env.AMAZON_PA_PARTNER_TAG!
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
