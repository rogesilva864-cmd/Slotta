import { getAppointmentDateTime } from '@/lib/reminders/service';

/** Opções que o dono pode escolher no painel. 0 = sem limite. */
export const SELF_SERVICE_MIN_HOURS_OPTIONS = [0, 2, 6, 12, 24, 48] as const;

export function isValidSelfServiceMinHours(value: unknown): value is number {
  return typeof value === 'number' && (SELF_SERVICE_MIN_HOURS_OPTIONS as readonly number[]).includes(value);
}

/**
 * true quando já passou do prazo para o cliente cancelar/remarcar sozinho
 * (faltam menos de `minHours` horas para o início). Com minHours 0 nunca trava,
 * que é o comportamento original do Slotta.
 */
export function isSelfServiceLocked(appointment: { date: string; startTime: string }, minHours: number, now = new Date()) {
  if (!minHours || minHours <= 0) return false;
  const start = getAppointmentDateTime(appointment.date, appointment.startTime).getTime();
  return start - now.getTime() < minHours * 60 * 60 * 1000;
}

export function selfServiceLockedMessage(companyName: string, minHours: number) {
  return `Faltam menos de ${minHours} horas para o seu horário. Para cancelar ou remarcar, fale direto com ${companyName} pelo WhatsApp.`;
}
