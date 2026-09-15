import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { getReminderStats } from '@/lib/reminders/service';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const stats = await getReminderStats(sessionUser.companyId);

  const recent = await prisma.reminder.findMany({
    where: { companyId: sessionUser.companyId },
    include: { appointment: { include: { customer: true, service: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    stats,
    recent: recent.map((reminder) => ({
      id: reminder.id,
      type: reminder.type,
      status: reminder.status,
      scheduledFor: reminder.scheduledFor,
      sentAt: reminder.sentAt,
      error: reminder.error,
      customerName: reminder.appointment.customer.name,
      serviceName: reminder.appointment.service.name,
      appointmentDate: reminder.appointment.date,
      appointmentTime: reminder.appointment.startTime,
    })),
  });
}
