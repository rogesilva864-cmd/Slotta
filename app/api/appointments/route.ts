import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { appointmentSchema } from '@/lib/validators';
import { calculateEndTime, getAvailableSlots } from '@/lib/availability';
import { notifyOwnersNewAppointment } from '@/lib/owner-notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
    }

    const { companyId, serviceId, customerName, phone, email, date, startTime, notes } = parsed.data;

    const service = await prisma.service.findFirst({
      where: { id: serviceId, companyId, active: true },
    });

    if (!service) {
      return NextResponse.json({ message: 'Serviço não encontrado ou inativo.' }, { status: 404 });
    }

    const availableSlots = await getAvailableSlots(companyId, serviceId, date);
    const selectedSlot = `${startTime} - ${calculateEndTime(startTime, service.durationMinutes)}`;

    if (!availableSlots.includes(selectedSlot)) {
      return NextResponse.json({ message: 'Este horário não está mais disponível.' }, { status: 409 });
    }

    const customer = await prisma.customer.upsert({
      where: {
        id: `customer-${companyId}-${phone.replace(/\D/g, '')}`,
      },
      update: { name: customerName, email: email || null },
      create: {
        id: `customer-${companyId}-${phone.replace(/\D/g, '')}`,
        companyId,
        name: customerName,
        phone,
        email: email || null,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        companyId,
        serviceId,
        customerId: customer.id,
        date,
        startTime,
        endTime: calculateEndTime(startTime, service.durationMinutes),
        price: service.price,
        status: 'PENDING',
        notes: notes || null,
      },
    });

    await prisma.notification.create({
      data: {
        companyId,
        title: 'Novo agendamento recebido',
        message: `${customerName} agendou ${service.name} para ${date} às ${startTime}.`,
        appointmentId: appointment.id,
      },
    });

    // Best-effort: avisa o dono (push/e-mail) sem atrasar nem derrubar a resposta ao cliente.
    void notifyOwnersNewAppointment(appointment.id).catch((error) => {
      console.error('[appointments] Falha ao notificar o dono:', error);
    });

    return NextResponse.json({ message: 'Agendamento solicitado com sucesso.', appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();

  // Consulta pública: exige o dado completo do cliente (telefone, e-mail ou
  // código) para nunca listar agendamentos de terceiros.
  if (!search) {
    return NextResponse.json({ appointments: [] });
  }

  const digits = search.replace(/\D/g, '');
  const conditions: Prisma.AppointmentWhereInput[] = [{ id: search }];
  if (search.includes('@')) {
    conditions.push({ customer: { email: { equals: search } } });
  }
  if (digits.length >= 10) {
    conditions.push({ customer: { id: { endsWith: digits } } });
  }

  const appointments = await prisma.appointment.findMany({
    where: { OR: conditions },
    include: {
      service: { select: { name: true } },
      customer: { select: { name: true, phone: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return NextResponse.json({ appointments });
}

