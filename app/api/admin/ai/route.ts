import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer evo-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { task } = await request.json();

  // Simulate AI Latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  let result = "";

  if (task === 'summarize') {
    result = "This article effectively argues that autonomous agents are the next evolution of DevOps. It covers key architectural patterns but could benefit from a more concrete code example in the third section.";
  } else if (task === 'grammar') {
    result = "Found 3 potential improvements:\n1. 'Its' -> 'It's' in paragraph 2.\n2. Active voice recommended for the introduction.\n3. Split the long sentence in the conclusion for better readability.";
  } else if (task === 'seo') {
    result = "SEO Score: 85/100\n- ✅ Keyword 'Autonomous' appears 5 times.\n- ✅ Title tag is optimal length.\n- ⚠️ Meta description is slightly too long (170 chars). Aim for 155.";
  } else {
    result = "Unknown task.";
  }

  return NextResponse.json({ result });
}
