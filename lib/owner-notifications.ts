import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push';
import {
  sendAppointmentCancelledByClientEmail,
  sendAppointmentRescheduledEmail,
  sendDailyDigestEmail,
  sendNewAppointmentEmail,
} from '@/lib/mailer';

const TIMEZONE = 'America/Sao_Paulo';
const DIGEST_START_MINUTES = 7 * 60 + 30;
const DIGEST_END_MINUTES = 12 * 60;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function nowInBrazil() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Avisa os donos da empresa sobre um novo pedido: push e, se não houver push ativo, e-mail. */
export async function notifyOwnersNewAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, company: { include: { users: true } } },
  });
  if (!appointment) return;

  const panelUrl = `${appUrl()}/admin`;
  const summary = `${appointment.customer.name} pediu ${appointment.service.name} para ${appointment.date} às ${appointment.startTime}.`;

  await Promise.all(
    appointment.company.users.map(async (user) => {
      try {
        const delivered = await sendPushToUser(user.id, {
          title: 'Novo pedido de agendamento',
          body: summary,
          url: '/admin',
          tag: `appointment-${appointment.id}`,
        });

        if (delivered === 0 && user.notifyEmailFallback) {
          await sendNewAppointmentEmail(user.email, {
            customerName: appointment.customer.name,
            serviceName: appointment.service.name,
            date: appointment.date,
            startTime: appointment.startTime,
            panelUrl,
          });
        }
      } catch (error) {
        console.error(`[owner-notifications] Falha ao avisar ${user.email}:`, error);
      }
    })
  );
}

/** Avisa os donos que o próprio cliente cancelou um agendamento (self-service). */
export async function notifyOwnersAppointmentCancelledByClient(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, company: { include: { users: true } } },
  });
  if (!appointment) return;

  const panelUrl = `${appUrl()}/admin`;
  const summary = `${appointment.customer.name} cancelou ${appointment.service.name} de ${appointment.date} às ${appointment.startTime}.`;

  await Promise.all(
    appointment.company.users.map(async (user) => {
      try {
        const delivered = await sendPushToUser(user.id, {
          title: 'Cliente cancelou o agendamento',
          body: summary,
          url: '/admin',
          tag: `appointment-${appointment.id}`,
        });

        if (delivered === 0 && user.notifyEmailFallback) {
          await sendAppointmentCancelledByClientEmail(user.email, {
            customerName: appointment.customer.name,
            serviceName: appointment.service.name,
            date: appointment.date,
            startTime: appointment.startTime,
            panelUrl,
          });
        }
      } catch (error) {
        console.error(`[owner-notifications] Falha ao avisar ${user.email} do cancelamento:`, error);
      }
    })
  );
}

/** Avisa os donos que o próprio cliente remarcou um agendamento (self-service, volta para PENDING). */
export async function notifyOwnersAppointmentRescheduled(
  appointmentId: string,
  previous: { date: string; startTime: string }
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true, company: { include: { users: true } } },
  });
  if (!appointment) return;

  const panelUrl = `${appUrl()}/admin`;
  const summary = `${appointment.customer.name} remarcou ${appointment.service.name}: ${previous.date} ${previous.startTime} → ${appointment.date} ${appointment.startTime}.`;

  await Promise.all(
    appointment.company.users.map(async (user) => {
      try {
        const delivered = await sendPushToUser(user.id, {
          title: 'Cliente remarcou o agendamento',
          body: summary,
          url: '/admin',
          tag: `appointment-${appointment.id}`,
        });

        if (delivered === 0 && user.notifyEmailFallback) {
          await sendAppointmentRescheduledEmail(user.email, {
            customerName: appointment.customer.name,
            serviceName: appointment.service.name,
            previousDate: previous.date,
            previousStartTime: previous.startTime,
            date: appointment.date,
            startTime: appointment.startTime,
            panelUrl,
          });
        }
      } catch (error) {
        console.error(`[owner-notifications] Falha ao avisar ${user.email} da remarcação:`, error);
      }
    })
  );
}

/** Envia, uma vez por dia entre 07:30 e 12:00 (Brasília), a agenda do dia para cada dono que ativou o resumo. */
export async function processDailyDigests() {
  const { date, minutes } = nowInBrazil();
  if (minutes < DIGEST_START_MINUTES || minutes >= DIGEST_END_MINUTES) return 0;

  const users = await prisma.user.findMany({
    where: {
      notifyDailyDigest: true,
      OR: [{ lastDigestOn: null }, { lastDigestOn: { not: date } }],
    },
  });

  let sent = 0;

  for (const user of users) {
    // Reivindica o dia de forma atômica para nunca enviar duplicado.
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ lastDigestOn: null }, { lastDigestOn: { not: date } }] },
      data: { lastDigestOn: date },
    });
    if (claimed.count === 0) continue;

    try {
      const appointments = await prisma.appointment.findMany({
        where: { companyId: user.companyId, date, status: { in: ['PENDING', 'CONFIRMED'] } },
        include: { customer: true, service: true },
        orderBy: { startTime: 'asc' },
      });
      if (appointments.length === 0) continue;

      const items = appointments.map((appointment) => ({
        time: appointment.startTime,
        customerName: appointment.customer.name,
        serviceName: appointment.service.name,
        status: STATUS_LABEL[appointment.status] ?? appointment.status.toLowerCase(),
      }));

      const [year, month, day] = date.split('-');
      await sendDailyDigestEmail(user.email, { dateLabel: `${day}/${month}/${year}`, items, panelUrl: `${appUrl()}/admin` });
      await sendPushToUser(user.id, {
        title: 'Sua agenda de hoje',
        body: `${items.length} ${items.length === 1 ? 'horário' : 'horários'}, o primeiro às ${items[0].time}.`,
        url: '/admin',
        tag: `digest-${date}`,
      });
      sent += 1;
    } catch (error) {
      console.error(`[owner-notifications] Falha no resumo diário de ${user.email}:`, error);
    }
  }

  return sent;
}
