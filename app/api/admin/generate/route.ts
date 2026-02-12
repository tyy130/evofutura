import { NextResponse } from 'next/server';
import { runContentPipeline } from '@/lib/automation';

export async function POST(request: Request) {
  // Simple auth check for the API route
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer evo-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runContentPipeline();
    return NextResponse.json({
      success: true,
      mode: result.mode,
      post: { title: result.post.title, slug: result.post.slug },
      sources: result.discoveredTopic?.sources.length || 0,
      claims: result.research?.claims.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
