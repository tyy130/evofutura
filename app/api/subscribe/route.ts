import { NextResponse } from 'next/server';
import { subscribeEmail } from '@/lib/subscriptions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const source = typeof body?.source === 'string' && body.source.length > 0 ? body.source : 'website';

    const result = await subscribeEmail(email, source);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('[Subscribe API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Unexpected subscription error. Please try again.' },
      { status: 500 }
    );
  }
}
