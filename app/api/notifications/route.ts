import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ notifications });
}
