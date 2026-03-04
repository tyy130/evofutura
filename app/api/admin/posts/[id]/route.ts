import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCategory, normalizePostType, parseSerializedTags, serializeTags } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer evo-admin-2026';
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await props.params;
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Defensive: Check if the model exists on the client before querying
    // This prevents crashes during hot-reloads where the client might be stale
    let revisions: { id: string; createdAt: Date; changeLog: string | null }[] = [];
    if (prisma.postRevision) {
      revisions = await prisma.postRevision.findMany({
        where: { postId: id },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    } else {
      console.warn("[API] prisma.postRevision is undefined. Skipping revision fetch.");
    }

    return NextResponse.json({
      post: {
        ...post,
        tags: parseSerializedTags(post.tags).join(', '),
        revisions: revisions
      }
    });
  } catch (error) {
    console.error("[API] GET Error:", error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const params = await props.params;
    const id = params.id;
    const body = await request.json();

    const currentPost = await prisma.post.findUnique({ where: { id } });

    // Defensive revision creation
    if (currentPost && prisma.postRevision) {
      await prisma.postRevision.create({
        data: {
          postId: id,
          title: currentPost.title,
          content: currentPost.content,
          changeLog: body.changeLog || "Manual Update"
        }
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        published: body.published,
        slug: body.slug,
        excerpt: body.excerpt,
        category: normalizeCategory(body.category),
        type: normalizePostType(body.type),
        tags: serializeTags(body.tags),
        image: body.image, // Added image field
      }
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = await props.params;
  const id = params.id;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
