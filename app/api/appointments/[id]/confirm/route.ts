import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return updateStatus(params.id);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return updateStatus(params.id);
}

async function updateStatus(appointmentId: string) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, companyId: sessionUser.companyId },
      include: { customer: true, service: true },
    });

    if (!appointment) {
      return NextResponse.json({ message: 'Agendamento não encontrado.' }, { status: 404 });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
    });

    await prisma.notification.create({
      data: {
        companyId: appointment.companyId,
        title: 'Agendamento confirmado',
        message: `${appointment.customer.name} teve o status atualizado para CONFIRMED.`,
        appointmentId: appointment.id,
      },
    });

    return NextResponse.json({ message: 'Agendamento confirmado.', appointment: updatedAppointment });
  } catch {
    return NextResponse.json({ message: 'Não foi possível confirmar o agendamento.' }, { status: 400 });
  }
}
