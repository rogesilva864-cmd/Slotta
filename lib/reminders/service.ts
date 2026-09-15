import { prisma } from '@/lib/prisma';
import { sendWhatsappMessage } from '@/lib/whatsapp';
import { REMINDER_INTERVAL_PRESETS, getPresetByKey } from './presets';

export { REMINDER_INTERVAL_PRESETS, getPresetByKey };

export function getAppointmentDateTime(date: string, startTime: string): Date {
  // Mesma convenção de fuso usada em lib/availability.ts para calcular o dia da semana.
  return new Date(`${date}T${startTime}:00-03:00`);
}

/** Garante que a empresa tenha uma configuração de lembretes, criando uma desativada por padrão na primeira vez. */
export async function getOrCreateReminderSetting(companyId: string) {
  const existing = await prisma.reminderSetting.findUnique({
    where: { companyId },
    include: { intervals: true },
  });

  if (existing) return existing;

  return prisma.reminderSetting.create({
    data: {
      companyId,
      enabled: false,
      testMode: false,
      intervals: {
        create: REMINDER_INTERVAL_PRESETS.filter((preset) => !preset.testOnly).map((preset) => ({
          key: preset.key,
          label: preset.label,
          minutesBefore: preset.minutesBefore,
          active: false,
        })),
      },
    },
    include: { intervals: true },
  });
}

/**
 * Cria os lembretes de um agendamento confirmado, de acordo com os
 * intervalos ativos da empresa. Intervalos cujo horário calculado já teria
 * passado são ignorados (evita mandar, por exemplo, um lembrete de "48 horas
 * antes" quando na verdade faltam 2 horas). Idempotente: chamar de novo para
 * o mesmo agendamento não duplica lembretes já criados.
 */
export async function createRemindersForAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return [];

  const setting = await prisma.reminderSetting.findUnique({
    where: { companyId: appointment.companyId },
    include: { intervals: { where: { active: true } } },
  });

  if (!setting || !setting.enabled || setting.intervals.length === 0) return [];

  const appointmentDateTime = getAppointmentDateTime(appointment.date, appointment.startTime);
  const now = new Date();
  const created = [];

  for (const interval of setting.intervals) {
    const scheduledFor = new Date(appointmentDateTime.getTime() - interval.minutesBefore * 60_000);
    if (scheduledFor <= now) continue;

    const reminder = await prisma.reminder.upsert({
      where: { appointmentId_type: { appointmentId, type: interval.key } },
      update: {},
      create: {
        companyId: appointment.companyId,
        appointmentId,
        type: interval.key,
        minutesBefore: interval.minutesBefore,
        scheduledFor,
        status: 'PENDING',
      },
    });
    created.push(reminder);
  }

  return created;
}

/** Cancela todos os lembretes ainda pendentes de um agendamento (usado ao rejeitar/cancelar). */
export async function cancelPendingRemindersForAppointment(appointmentId: string) {
  return prisma.reminder.updateMany({
    where: { appointmentId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });
}

export async function getReminderStats(companyId: string) {
  const grouped = await prisma.reminder.groupBy({
    by: ['status'],
    where: { companyId },
    _count: { _all: true },
  });

  const stats = { pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 };
  for (const row of grouped) {
    const count = row._count._all;
    stats.total += count;
    const key = row.status.toLowerCase() as keyof typeof stats;
    if (key in stats && key !== 'total') stats[key] = count;
  }
  return stats;
}

/**
 * Processa lembretes PENDING cujo horário programado já chegou (ou já
 * passou, caso o worker tenha ficado parado). Reivindica cada lembrete
 * atomicamente antes de enviar, para nunca processar o mesmo lembrete duas
 * vezes mesmo se chamado concorrentemente.
 */
export async function processDueReminders(options?: { companyId?: string; limit?: number }) {
  const now = new Date();

  const dueReminders = await prisma.reminder.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
      ...(options?.companyId ? { companyId: options.companyId } : {}),
    },
    include: {
      appointment: { include: { customer: true, service: true, company: true } },
    },
    orderBy: { scheduledFor: 'asc' },
    take: options?.limit ?? 50,
  });

  const results = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  for (const reminder of dueReminders) {
    results.processed += 1;

    // Reivindicação atômica: só segue se o lembrete ainda estiver PENDING no
    // instante do update — protege contra processamento duplicado/concorrente.
    const claim = await prisma.reminder.updateMany({
      where: { id: reminder.id, status: 'PENDING' },
      data: { attempts: { increment: 1 } },
    });

    if (claim.count === 0) {
      results.skipped += 1;
      continue;
    }

    const appointment = reminder.appointment;

    if (!appointment || appointment.status !== 'CONFIRMED') {
      await prisma.reminder.update({ where: { id: reminder.id }, data: { status: 'CANCELLED' } });
      results.skipped += 1;
      continue;
    }

    const preset = getPresetByKey(reminder.type);

    const sendResult = await sendWhatsappMessage({
      to: appointment.customer.phone,
      templateType: 'APPOINTMENT_REMINDER',
      variables: {
        customerName: appointment.customer.name,
        companyName: appointment.company.name,
        serviceName: appointment.service.name,
        date: appointment.date,
        startTime: appointment.startTime,
        intervalLabel: preset?.label ?? `${reminder.minutesBefore} minutos`,
      },
    });

    if (sendResult.success) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'SENT', sentAt: new Date(), error: null },
      });
      results.sent += 1;
    } else {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED', error: sendResult.error },
      });
      results.failed += 1;
    }
  }

  return results;
}

/** Mensagem imediata de confirmação — respeita o mesmo interruptor "ativar WhatsApp" da empresa. */
export async function sendAppointmentConfirmedMessage(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, company: true },
  });
  if (!appointment) return;

  const setting = await prisma.reminderSetting.findUnique({ where: { companyId: appointment.companyId } });
  if (!setting?.enabled) return;

  try {
    await sendWhatsappMessage({
      to: appointment.customer.phone,
      templateType: 'APPOINTMENT_CONFIRMED',
      variables: {
        customerName: appointment.customer.name,
        companyName: appointment.company.name,
        serviceName: appointment.service.name,
        date: appointment.date,
        startTime: appointment.startTime,
      },
    });
  } catch (error) {
    console.error('[reminders] Falha ao enviar confirmação por WhatsApp:', error);
  }
}

/** Mensagem imediata de cancelamento — mesmo interruptor da empresa. */
export async function sendAppointmentCancelledMessage(appointmentId: string, reason?: string | null) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, company: true },
  });
  if (!appointment) return;

  const setting = await prisma.reminderSetting.findUnique({ where: { companyId: appointment.companyId } });
  if (!setting?.enabled) return;

  try {
    await sendWhatsappMessage({
      to: appointment.customer.phone,
      templateType: 'APPOINTMENT_CANCELLED',
      variables: {
        customerName: appointment.customer.name,
        companyName: appointment.company.name,
        serviceName: appointment.service.name,
        date: appointment.date,
        startTime: appointment.startTime,
        reason: reason ?? '',
      },
    });
  } catch (error) {
    console.error('[reminders] Falha ao enviar cancelamento por WhatsApp:', error);
  }
}
