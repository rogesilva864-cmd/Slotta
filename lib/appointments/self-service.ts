import { prisma } from '@/lib/prisma';
import { calculateEndTime, getAvailableSlots } from '@/lib/availability';
import { cancelPendingRemindersForAppointment } from '@/lib/reminders/service';
import { canCancelAppointment } from '@/lib/appointments/cancel';
import { notifyOwnersAppointmentCancelledByClient, notifyOwnersAppointmentRescheduled } from '@/lib/owner-notifications';

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

/** Confere se quem está pedindo é de fato o dono do agendamento, pelo mesmo dado usado para encontrá-lo (telefone, e-mail ou código). */
function ownsAppointment(appointment: { id: string; customer: { phone: string; email: string | null } }, contact: string) {
  const trimmed = contact.trim();
  if (!trimmed) return false;
  if (trimmed === appointment.id) return true;
  if (trimmed.includes('@')) return (appointment.customer.email ?? '').toLowerCase() === trimmed.toLowerCase();

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) return false;
  return appointment.customer.phone.replace(/\D/g, '') === digits;
}

type ActionResult = { ok: false; message: string; status: number } | { ok: true; message: string };

async function loadOwnedAppointment(appointmentId: string, contact: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, company: true },
  });

  if (!appointment) return { error: { ok: false as const, message: 'Agendamento não encontrado.', status: 404 } };
  if (!ownsAppointment(appointment, contact)) {
    return { error: { ok: false as const, message: 'Não foi possível confirmar seus dados. Verifique o telefone, e-mail ou código informado na busca.', status: 403 } };
  }
  return { appointment };
}

/** Cliente cancela o próprio agendamento (sem precisar do dono). */
export async function selfCancelAppointment(params: { appointmentId: string; contact: string }): Promise<ActionResult> {
  const { appointment, error } = await loadOwnedAppointment(params.appointmentId, params.contact);
  if (error) return error;

  if (!canCancelAppointment(appointment)) {
    return { ok: false, message: 'Este agendamento não pode mais ser cancelado (já passou ou já foi encerrado).', status: 400 };
  }

  const claimed = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: { in: CANCELLABLE_STATUSES } },
    data: { status: 'CANCELLED', rejectionReason: 'Cancelado pelo cliente.' },
  });
  if (claimed.count === 0) return { ok: false, message: 'Este agendamento já foi cancelado.', status: 409 };

  await prisma.notification.create({
    data: {
      companyId: appointment.companyId,
      title: 'Cliente cancelou o agendamento',
      message: `${appointment.customer.name} cancelou o horário de ${appointment.date} às ${appointment.startTime}.`,
      appointmentId: appointment.id,
    },
  });
  await cancelPendingRemindersForAppointment(appointment.id).catch((error2) => {
    console.error('[self-service] Falha ao cancelar lembretes:', error2);
  });
  void notifyOwnersAppointmentCancelledByClient(appointment.id).catch((error2) => {
    console.error('[self-service] Falha ao notificar o dono do cancelamento:', error2);
  });

  return { ok: true, message: 'Agendamento cancelado com sucesso.' };
}

/** Cliente remarca o próprio agendamento para um novo horário disponível; volta para PENDING até o dono confirmar. */
export async function selfRescheduleAppointment(params: {
  appointmentId: string;
  contact: string;
  date: string;
  startTime: string;
}): Promise<ActionResult> {
  const { appointment, error } = await loadOwnedAppointment(params.appointmentId, params.contact);
  if (error) return error;

  if (!canCancelAppointment(appointment)) {
    return { ok: false, message: 'Este agendamento não pode mais ser remarcado (já passou ou já foi encerrado).', status: 400 };
  }

  if (params.date === appointment.date && params.startTime === appointment.startTime) {
    return { ok: false, message: 'Esse já é o seu horário atual.', status: 400 };
  }

  if (!appointment.service.active) {
    return { ok: false, message: 'Este serviço não está mais disponível para agendamento.', status: 400 };
  }

  const availableSlots = await getAvailableSlots(appointment.companyId, appointment.serviceId, params.date);
  const endTime = calculateEndTime(params.startTime, appointment.service.durationMinutes);
  const selectedSlot = `${params.startTime} - ${endTime}`;

  if (!availableSlots.includes(selectedSlot)) {
    return { ok: false, message: 'Este horário não está mais disponível. Escolha outro.', status: 409 };
  }

  const previous = { date: appointment.date, startTime: appointment.startTime };

  const claimed = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: { in: CANCELLABLE_STATUSES } },
    data: { date: params.date, startTime: params.startTime, endTime, status: 'PENDING', rejectionReason: null },
  });
  if (claimed.count === 0) return { ok: false, message: 'Não foi possível remarcar — tente buscar seu agendamento de novo.', status: 409 };

  await prisma.notification.create({
    data: {
      companyId: appointment.companyId,
      title: 'Cliente remarcou o agendamento',
      message: `${appointment.customer.name} remarcou de ${previous.date} às ${previous.startTime} para ${params.date} às ${params.startTime}.`,
      appointmentId: appointment.id,
    },
  });
  await cancelPendingRemindersForAppointment(appointment.id).catch((error2) => {
    console.error('[self-service] Falha ao cancelar lembretes antigos:', error2);
  });
  void notifyOwnersAppointmentRescheduled(appointment.id, previous).catch((error2) => {
    console.error('[self-service] Falha ao notificar o dono da remarcação:', error2);
  });

  return { ok: true, message: 'Pedido de remarcação enviado! A empresa vai confirmar o novo horário.' };
}
