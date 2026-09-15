import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const date = typeof body.date === 'string' ? body.date : '';
    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    const endTime = typeof body.endTime === 'string' ? body.endTime : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ message: 'Informe data, horário inicial e final.' }, { status: 400 });
    }

    const blockedTime = await prisma.blockedTime.create({
      data: {
        companyId: sessionUser.companyId,
        date,
        startTime,
        endTime,
        reason: reason || null,
      },
    });

    return NextResponse.json({ blockedTime }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Não foi possível bloquear o horário.' }, { status: 500 });
  }
}
