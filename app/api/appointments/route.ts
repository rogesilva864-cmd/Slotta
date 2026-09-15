import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { appointmentSchema } from '@/lib/validators';
import { calculateEndTime, getAvailableSlots } from '@/lib/availability';

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

    return NextResponse.json({ message: 'Agendamento solicitado com sucesso.', appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Não foi possível criar o agendamento.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();

  const appointments = await prisma.appointment.findMany({
    include: {
      service: true,
      customer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const filteredAppointments = search
    ? appointments.filter((appointment) => {
        const customer = appointment.customer;
        const searchValue = search.toLowerCase();
        return (
          customer.name.toLowerCase().includes(searchValue) ||
          customer.phone.toLowerCase().includes(searchValue) ||
          (customer.email ?? '').toLowerCase().includes(searchValue) ||
          appointment.id.toLowerCase().includes(searchValue)
        );
      })
    : appointments;

  return NextResponse.json({ appointments: filteredAppointments });
}

