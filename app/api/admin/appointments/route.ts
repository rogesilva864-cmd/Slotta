import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim().toLowerCase();
  const status = searchParams.get('status')?.trim().toUpperCase();

  const appointments = await prisma.appointment.findMany({
    where: {
      companyId: sessionUser.companyId,
      ...(status && status !== 'ALL' ? { status } : {}),
    },
    include: { service: true, customer: true },
    orderBy: { createdAt: 'desc' },
  });

  const filtered = search
    ? appointments.filter((appointment) => {
        return (
          appointment.customer.name.toLowerCase().includes(search) ||
          appointment.customer.phone.toLowerCase().includes(search) ||
          (appointment.customer.email ?? '').toLowerCase().includes(search) ||
          appointment.id.toLowerCase().includes(search) ||
          appointment.service.name.toLowerCase().includes(search)
        );
      })
    : appointments;

  return NextResponse.json({ appointments: filtered });
}
