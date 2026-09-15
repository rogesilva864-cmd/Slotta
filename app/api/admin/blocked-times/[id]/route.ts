import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const blockedTime = await prisma.blockedTime.findFirst({
    where: { id: params.id, companyId: sessionUser.companyId },
  });

  if (!blockedTime) {
    return NextResponse.json({ message: 'Bloqueio não encontrado.' }, { status: 404 });
  }

  await prisma.blockedTime.delete({ where: { id: blockedTime.id } });
  return NextResponse.json({ message: 'Bloqueio removido.' });
}
