import { NextRequest, NextResponse } from 'next/server';
import { createCommentForSlug, getCommentsForSlug } from '@/lib/comments';
import { verifyInvisibleCaptcha } from '@/lib/captcha';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase() || '';
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Missing slug parameter.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const comments = await getCommentsForSlug(slug);
    return NextResponse.json(
      { success: true, comments },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[Comments API GET] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Unable to load comments at the moment.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const captchaResult = await verifyInvisibleCaptcha({
      token: typeof body?.captchaToken === 'string' ? body.captchaToken : '',
      headers: request.headers,
      expectedAction: 'comment_submit',
    });

    if (!captchaResult.success) {
      return NextResponse.json(
        { success: false, message: captchaResult.message },
        { status: captchaResult.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const result = await createCommentForSlug({
      slug: typeof body?.slug === 'string' ? body.slug : '',
      name: typeof body?.name === 'string' ? body.name : '',
      content: typeof body?.content === 'string' ? body.content : '',
      email: typeof body?.email === 'string' ? body.email : undefined,
      source: typeof body?.source === 'string' ? body.source : 'article',
      honeypot: typeof body?.company === 'string' ? body.company : '',
      headers: request.headers,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, message: result.message, comment: result.comment },
      { status: result.status, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[Comments API POST] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Unable to publish comment right now.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
