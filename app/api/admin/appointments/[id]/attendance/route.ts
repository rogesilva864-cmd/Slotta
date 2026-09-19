import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { getAppointmentDateTime } from '@/lib/reminders/service';

const ATTENDANCE_STATUSES = ['COMPLETED', 'NO_SHOW'] as const;
const EDITABLE_FROM = ['CONFIRMED', 'COMPLETED', 'NO_SHOW'];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!ATTENDANCE_STATUSES.includes(status)) {
    return NextResponse.json({ message: 'Status inválido.' }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, companyId: sessionUser.companyId },
  });
  if (!appointment) {
    return NextResponse.json({ message: 'Agendamento não encontrado.' }, { status: 404 });
  }
  if (!EDITABLE_FROM.includes(appointment.status)) {
    return NextResponse.json({ message: 'Só é possível registrar presença em agendamentos confirmados.' }, { status: 400 });
  }
  if (getAppointmentDateTime(appointment.date, appointment.startTime) > new Date()) {
    return NextResponse.json({ message: 'Só é possível registrar a presença depois do horário do atendimento.' }, { status: 400 });
  }

  const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status } });
  return NextResponse.json({ message: status === 'COMPLETED' ? 'Atendimento registrado como concluído.' : 'Falta registrada.', appointment: updated });
}
