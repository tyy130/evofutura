import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isRuntimeSqliteOnVercel = Boolean(process.env.VERCEL) && (process.env.DATABASE_URL || '').startsWith('file:');

export async function POST(request: Request) {
  if (isRuntimeSqliteOnVercel) {
    return NextResponse.json({ success: true, tracked: false }, { status: 202 });
  }

  try {
    const body = await request.json();
    const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : '';

    if (!slug || slug.length > 160 || !SLUG_REGEX.test(slug)) {
      return NextResponse.json({ success: false, error: 'Invalid slug' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, published: true },
    });

    if (!post || !post.published) {
      return NextResponse.json({ success: true }, { status: 204 });
    }

    await prisma.postView.create({
      data: {
        postId: post.id,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[Analytics] view tracking failed:', error);
    return NextResponse.json({ success: false, error: 'Unexpected analytics error' }, { status: 500 });
  }
}
