import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    where: { companyId: sessionUser.companyId },
    include: {
      appointments: {
        orderBy: { date: 'desc' },
        include: { service: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const result = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt,
    appointmentsCount: customer.appointments.length,
    lastAppointment: customer.appointments[0]
      ? {
          date: customer.appointments[0].date,
          startTime: customer.appointments[0].startTime,
          status: customer.appointments[0].status,
          serviceName: customer.appointments[0].service.name,
        }
      : null,
  }));

  return NextResponse.json({ customers: result });
}
