import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSerializedTags } from '@/lib/taxonomy';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer evo-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    orderBy: { date: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      category: true,
      type: true,
      tags: true,
      date: true,
      author: true
    }
  });

  return NextResponse.json({
    posts: posts.map(post => ({
      ...post,
      tags: parseSerializedTags(post.tags),
    })),
  });
}
