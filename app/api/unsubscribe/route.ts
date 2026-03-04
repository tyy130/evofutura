import { NextResponse } from 'next/server';
import { unsubscribeWithToken } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

function getParams(request: Request) {
  const { searchParams } = new URL(request.url);
  return {
    email: (searchParams.get('email') || '').trim(),
    token: (searchParams.get('token') || '').trim(),
  };
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const { email, token } = getParams(request);
  const target = `/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  return NextResponse.redirect(`${origin}${target}`);
}

export async function POST(request: Request) {
  const { email, token } = getParams(request);

  if (!email || !token) {
    return new NextResponse('Invalid unsubscribe request.', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const result = await unsubscribeWithToken(email, token);
  return new NextResponse(result.message, {
    status: result.success ? 200 : 400,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS',
    },
  });
}
