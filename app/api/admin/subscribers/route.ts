import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer evo-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      source: true,
      active: true,
      createdAt: true
    }
  });

  return NextResponse.json({ subscribers });
}
