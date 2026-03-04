import { NextResponse } from 'next/server';
import { isAuthorizedCronCall, runWeeklyDigest } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!isAuthorizedCronCall(authHeader)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';

  try {
    const result = await runWeeklyDigest({ force });
    const status = result.ok || result.skipped ? 200 : 503;
    return NextResponse.json({ success: result.ok, result }, { status });
  } catch (error) {
    console.error('[Cron Newsletter] run failed:', error);
    return NextResponse.json({ success: false, error: 'Newsletter cron failed' }, { status: 500 });
  }
}
