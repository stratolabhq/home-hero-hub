import { NextRequest, NextResponse } from 'next/server';
import { runImport } from '@/lib/import-service';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
      'cron',
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
