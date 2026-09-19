import { prisma } from '@/lib/prisma';
import { sendWhatsappMessage } from '@/lib/whatsapp';
import { sendReviewRequestEmail } from '@/lib/mailer';

export const REVIEW_DELAY_OPTIONS = [60, 120, 240, 1440] as const;
const DEFAULT_DELAY_MINUTES = 120;
const LOOKBACK_DAYS = 2;
const MAX_PER_RUN = 20;

export function isValidReviewUrl(value: string) {
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isValidReviewDelay(value: number) {
  return (REVIEW_DELAY_OPTIONS as readonly number[]).includes(value);
}

function brazilDateString(offsetDays = 0) {
  const shifted = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(shifted);
}

/** Momento em que o atendimento termina (mesma convenção de fuso do restante do sistema). */
export function appointmentEndsAt(date: string, endTime: string) {
  return new Date(`${date}T${endTime}:00-03:00`);
}

export function isReviewDue(params: { endsAt: Date; delayMinutes: number; now: Date }) {
  const dueAt = params.endsAt.getTime() + params.delayMinutes * 60_000;
  return dueAt <= params.now.getTime() && params.now.getTime() - dueAt <= LOOKBACK_DAYS * 24 * 60 * 60_000;
}

/**
 * Pede a avaliação de atendimentos confirmados que já terminaram há X minutos
 * (definido por empresa). Cada agendamento recebe no máximo um pedido: o
 * registro é criado primeiro (appointmentId é único), o que impede envio
 * duplicado mesmo com execuções concorrentes ou reinícios do servidor.
 */
export async function processReviewRequests(now = new Date()) {
  const settings = await prisma.reminderSetting.findMany({
    where: { reviewEnabled: true, reviewUrl: { not: null } },
  });

  const recentDates = Array.from({ length: LOOKBACK_DAYS + 1 }, (_, index) => brazilDateString(-index));
  const results = { sent: 0, failed: 0, skipped: 0 };
  let budget = MAX_PER_RUN;

  for (const setting of settings) {
    if (budget <= 0) break;
    if (!setting.reviewUrl || !isValidReviewUrl(setting.reviewUrl)) continue;

    const candidates = await prisma.appointment.findMany({
      where: {
        companyId: setting.companyId,
        status: 'CONFIRMED',
        date: { in: recentDates },
        reviewRequest: null,
      },
      include: { customer: true, company: true },
    });

    for (const appointment of candidates) {
      if (budget <= 0) break;
      const endsAt = appointmentEndsAt(appointment.date, appointment.endTime);
      if (!isReviewDue({ endsAt, delayMinutes: setting.reviewDelayMinutes, now })) continue;

      try {
        await prisma.reviewRequest.create({
          data: { companyId: setting.companyId, appointmentId: appointment.id, status: 'PROCESSING' },
        });
      } catch {
        continue; // outro processo já reivindicou este agendamento
      }
      budget -= 1;

      const channels: string[] = [];
      const errors: string[] = [];

      if (setting.enabled) {
        const whatsapp = await sendWhatsappMessage({
          to: appointment.customer.phone,
          templateType: 'REVIEW_REQUEST',
          variables: {
            customerName: appointment.customer.name,
            companyName: appointment.company.name,
            reviewUrl: setting.reviewUrl,
          },
        });
        if (whatsapp.success) channels.push('whatsapp');
        else errors.push(`WhatsApp: ${whatsapp.error}`);
      }

      if (appointment.customer.email) {
        try {
          const email = await sendReviewRequestEmail(appointment.customer.email, {
            customerName: appointment.customer.name,
            companyName: appointment.company.name,
            reviewUrl: setting.reviewUrl,
          });
          if (email.delivered) channels.push('email');
          else errors.push('E-mail: serviço de e-mail não configurado.');
        } catch (error) {
          errors.push(`E-mail: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
      }

      const attempted = setting.enabled || Boolean(appointment.customer.email);
      const status = channels.length > 0 ? 'SENT' : attempted ? 'FAILED' : 'SKIPPED';

      await prisma.reviewRequest.update({
        where: { appointmentId: appointment.id },
        data: {
          status,
          channels: channels.join(',') || null,
          error: errors.join(' | ') || (attempted ? null : 'Cliente sem e-mail e WhatsApp desativado.'),
          sentAt: channels.length > 0 ? new Date() : null,
        },
      });

      if (status === 'SENT') results.sent += 1;
      else if (status === 'FAILED') results.failed += 1;
      else results.skipped += 1;
    }
  }

  return results;
}

export async function getReviewStats(companyId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.reviewRequest.groupBy({
    by: ['status'],
    where: { companyId, createdAt: { gte: since } },
    _count: { _all: true },
  });

  const stats = { sent: 0, failed: 0, skipped: 0 };
  for (const row of grouped) {
    if (row.status === 'SENT') stats.sent = row._count._all;
    if (row.status === 'FAILED') stats.failed = row._count._all;
    if (row.status === 'SKIPPED') stats.skipped = row._count._all;
  }
  return stats;
}
