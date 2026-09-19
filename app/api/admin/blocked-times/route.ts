import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

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
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 120) : '';

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ message: 'Informe data, horário inicial e final.' }, { status: 400 });
    }
    if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return NextResponse.json({ message: 'Data ou horário em formato inválido.' }, { status: 400 });
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return NextResponse.json({ message: 'O horário final precisa ser depois do inicial.' }, { status: 400 });
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

    // O bloqueio só impede novos pedidos: agendamentos já marcados no período continuam valendo,
    // então avisamos o dono para ele decidir o que fazer com cada um.
    const sameDay = await prisma.appointment.findMany({
      where: { companyId: sessionUser.companyId, date, status: { in: ['PENDING', 'CONFIRMED'] } },
      include: { customer: true },
      orderBy: { startTime: 'asc' },
    });
    const conflicts = sameDay
      .filter((appointment) => toMinutes(appointment.startTime) < toMinutes(endTime) && toMinutes(appointment.endTime) > toMinutes(startTime))
      .map((appointment) => ({
        id: appointment.id,
        customerName: appointment.customer.name,
        startTime: appointment.startTime,
        status: appointment.status,
      }));

    return NextResponse.json({ blockedTime, conflicts }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Não foi possível bloquear o horário.' }, { status: 500 });
  }
}
