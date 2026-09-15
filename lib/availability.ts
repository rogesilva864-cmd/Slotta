import { prisma } from '@/lib/prisma';

export async function getAvailableSlots(companyId: string, serviceId: string, date: string) {
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

    if (!isBlocked && !isBusy) {
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
