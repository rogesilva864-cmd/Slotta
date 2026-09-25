import { prisma } from '@/lib/prisma';

const TIMEZONE = 'America/Sao_Paulo';

/** Data (AAAA-MM-DD) e minutos desde 00:00 no horário de Brasília. */
export function brazilNowParts(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Um horário que já começou (ou está em um dia anterior) não pode mais ser agendado. */
export function isSlotInPast(date: string, slotStartMinutes: number, now: Date = new Date()) {
  const today = brazilNowParts(now);
  if (date < today.date) return true;
  return date === today.date && slotStartMinutes <= today.minutes;
}

/** Um atendimento que invade a pausa (ex: almoço) não pode ser oferecido. Encostar no início ou no fim da pausa é permitido. */
export function overlapsBreak(slotStartMinutes: number, durationMinutes: number, breakStart?: string | null, breakEnd?: string | null) {
  if (!breakStart || !breakEnd) return false;
  return slotStartMinutes < timeToMinutes(breakEnd) && slotStartMinutes + durationMinutes > timeToMinutes(breakStart);
}

/** `ignoreBookings` devolve os horários que existiriam sem agendamentos nem bloqueios (usado para saber se o dia "atende" de fato). */
export async function getAvailableSlots(
  companyId: string,
  serviceId: string,
  date: string,
  now: Date = new Date(),
  options: { ignoreBookings?: boolean } = {}
) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, companyId, active: true },
  });

  if (!service) {
    return [];
  }

  const businessHours = await prisma.businessHour.findMany({
    where: { companyId, active: true },
  });

  const blockedTimes = await prisma.blockedTime.findMany({
    where: { companyId, date },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      companyId,
      date,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });

  const dayNumber = new Date(`${date}T00:00:00-03:00`).getDay();
  const todayHours = businessHours.find((item) => item.dayOfWeek === dayNumber);

  if (!todayHours) return [];

  const slots: string[] = [];
  const start = timeToMinutes(todayHours.openingTime);
  const end = timeToMinutes(todayHours.closingTime);
  const duration = service.durationMinutes;

  for (let current = start; current + duration <= end; current += 30) {
    if (isSlotInPast(date, current, now)) continue;
    if (overlapsBreak(current, duration, todayHours.breakStart, todayHours.breakEnd)) continue;

    const slot = minutesToTime(current);
    const slotEnd = minutesToTime(current + duration);

    const isBlocked = blockedTimes.some((item) => {
      const startMin = timeToMinutes(item.startTime);
      const endMin = timeToMinutes(item.endTime);
      return current < endMin && current + duration > startMin;
    });

    const isBusy = appointments.some((appointment) => {
      const appointmentStart = timeToMinutes(appointment.startTime);
      const appointmentEnd = timeToMinutes(appointment.endTime);
      return current < appointmentEnd && current + duration > appointmentStart;
    });

    if (options.ignoreBookings || (!isBlocked && !isBusy)) {
      slots.push(`${slot} - ${slotEnd}`);
    }
  }

  return slots;
}

export function calculateEndTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
