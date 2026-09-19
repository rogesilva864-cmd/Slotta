import { prisma } from '@/lib/prisma';
import { sendAppointmentCancelledEmail } from '@/lib/mailer';
import { cancelPendingRemindersForAppointment, getAppointmentDateTime, sendAppointmentCancelledMessage } from '@/lib/reminders/service';

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];
export const DEFAULT_CANCEL_REASON = 'Imprevisto do profissional.';

/** Só dá para cancelar atendimentos ainda não confirmados/confirmados e que não terminaram. */
export function canCancelAppointment(input: { status: string; date: string; endTime: string }, now = new Date()) {
  return CANCELLABLE_STATUSES.includes(input.status) && getAppointmentDateTime(input.date, input.endTime) > now;
}

export type CancelResult =
  | { ok: false; message: string; status: number }
  | {
      ok: true;
      customerName: string;
      customerPhone: string;
      /** Canais pelos quais o cliente realmente foi avisado. */
      notifiedBy: ('whatsapp' | 'email')[];
      /** Nenhum canal funcionou: o dono precisa avisar o cliente por conta própria. */
      needsManualContact: boolean;
    };

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export async function cancelAppointmentAndNotify(params: { appointmentId: string; companyId: string; reason?: string }): Promise<CancelResult> {
  const reason = (params.reason ?? '').trim().slice(0, 200) || DEFAULT_CANCEL_REASON;

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.appointmentId, companyId: params.companyId },
    include: { customer: true, service: true, company: true },
  });

  if (!appointment) return { ok: false, message: 'Agendamento não encontrado.', status: 404 };
  if (!canCancelAppointment(appointment)) {
    return { ok: false, message: 'Este agendamento não pode mais ser cancelado (já terminou ou já foi encerrado).', status: 400 };
  }

  // A troca de status é condicional para que dois cliques/execuções nunca avisem o cliente duas vezes.
  const claimed = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: { in: CANCELLABLE_STATUSES } },
    data: { status: 'CANCELLED', rejectionReason: reason },
  });
  if (claimed.count === 0) return { ok: false, message: 'Este agendamento já foi cancelado.', status: 409 };

  await prisma.notification.create({
    data: {
      companyId: appointment.companyId,
      title: 'Agendamento cancelado',
      message: `${appointment.customer.name} teve o horário de ${appointment.date} às ${appointment.startTime} cancelado: ${reason}`,
      appointmentId: appointment.id,
    },
  });
  await cancelPendingRemindersForAppointment(appointment.id).catch((error) => {
    console.error('[appointments/cancel] Falha ao cancelar lembretes:', error);
  });

  const notifiedBy: ('whatsapp' | 'email')[] = [];

  const whatsapp = await sendAppointmentCancelledMessage(appointment.id, reason);
  if (whatsapp.status === 'sent') notifiedBy.push('whatsapp');

  if (appointment.customer.email) {
    try {
      const email = await sendAppointmentCancelledEmail(appointment.customer.email, {
        customerName: appointment.customer.name,
        companyName: appointment.company.name,
        serviceName: appointment.service.name,
        date: appointment.date,
        startTime: appointment.startTime,
        reason,
        bookingUrl: `${appUrl()}/agendar/${appointment.company.slug}`,
      });
      if (email.delivered) notifiedBy.push('email');
    } catch (error) {
      console.error('[appointments/cancel] Falha ao enviar e-mail de cancelamento:', error);
    }
  }

  return {
    ok: true,
    customerName: appointment.customer.name,
    customerPhone: appointment.customer.phone,
    notifiedBy,
    needsManualContact: notifiedBy.length === 0,
  };
}
