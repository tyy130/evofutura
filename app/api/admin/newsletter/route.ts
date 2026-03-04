import { NextResponse } from 'next/server';
import { runWeeklyDigest } from '@/lib/newsletter';

function isAuthorized(request: Request) {
  return request.headers.get('authorization') === 'Bearer evo-admin-2026';
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let force = false;
  try {
    const body = await request.json();
    force = Boolean(body?.force);
  } catch {
    force = false;
  }

  try {
    const result = await runWeeklyDigest({ force });
    const status = result.ok || result.skipped ? 200 : 503;
    return NextResponse.json({ success: result.ok, result }, { status });
  } catch (error) {
    console.error('[Admin Newsletter] run failed:', error);
    return NextResponse.json({ success: false, error: 'Newsletter run failed' }, { status: 500 });
  }
}
