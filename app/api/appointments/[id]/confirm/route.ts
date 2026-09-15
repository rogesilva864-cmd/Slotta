import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { createRemindersForAppointment, sendAppointmentConfirmedMessage } from '@/lib/reminders/service';

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

    // Best-effort: agenda os lembretes e dispara a confirmação por WhatsApp
    // sem bloquear/derrubar a resposta caso o envio falhe.
    await createRemindersForAppointment(appointment.id).catch((error) => {
      console.error('[appointments/confirm] Falha ao criar lembretes:', error);
    });
    await sendAppointmentConfirmedMessage(appointment.id);

    return NextResponse.json({ message: 'Agendamento confirmado.', appointment: updatedAppointment });
  } catch {
    return NextResponse.json({ message: 'Não foi possível confirmar o agendamento.' }, { status: 400 });
  }
}
