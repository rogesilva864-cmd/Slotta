import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const removed = await prisma.waitlistEntry.deleteMany({ where: { id: params.id, companyId: sessionUser.companyId } });
  if (removed.count === 0) {
    return NextResponse.json({ message: 'Entrada não encontrada.' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Removido da lista de espera.' });
}
