import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { brazilNowParts } from '@/lib/availability';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const entries = await prisma.waitlistEntry.findMany({
    where: { companyId: sessionUser.companyId, date: { gte: brazilNowParts().date } },
    include: { service: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ entries });
}
