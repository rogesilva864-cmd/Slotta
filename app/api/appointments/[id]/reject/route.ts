import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { cancelPendingRemindersForAppointment, sendAppointmentCancelledMessage } from '@/lib/reminders/service';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return rejectAppointment(params.id, request);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return rejectAppointment(params.id, request);
}

async function rejectAppointment(appointmentId: string, request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rejectionReason = typeof body.reason === 'string' ? body.reason : 'Sem motivo informado.';

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, companyId: sessionUser.companyId },
      include: { customer: true },
    });

    if (!appointment) {
      return NextResponse.json({ message: 'Agendamento não encontrado.' }, { status: 404 });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'REJECTED',
        rejectionReason,
      },
    });

    await prisma.notification.create({
      data: {
        companyId: appointment.companyId,
        title: 'Agendamento rejeitado',
        message: `${appointment.customer.name} foi rejeitado(a): ${rejectionReason}`,
        appointmentId: appointment.id,
      },
    });

    // Cancela lembretes pendentes desse agendamento e avisa o cliente por WhatsApp (best-effort).
    await cancelPendingRemindersForAppointment(appointment.id).catch((error) => {
      console.error('[appointments/reject] Falha ao cancelar lembretes:', error);
    });
    await sendAppointmentCancelledMessage(appointment.id, rejectionReason);

    return NextResponse.json({ message: 'Agendamento rejeitado.', appointment: updatedAppointment });
  } catch {
    return NextResponse.json({ message: 'Não foi possível rejeitar o agendamento.' }, { status: 400 });
  }
}
