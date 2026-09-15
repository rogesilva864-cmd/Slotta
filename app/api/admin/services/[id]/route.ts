import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const service = await prisma.service.findFirst({
    where: { id: params.id, companyId: sessionUser.companyId },
  });

  if (!service) {
    return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
    if (typeof body.description === 'string') data.description = body.description.trim() || null;
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (Number.isNaN(price) || price < 0) {
        return NextResponse.json({ message: 'Preço inválido.' }, { status: 400 });
      }
      data.price = price;
    }
    if (body.durationMinutes !== undefined) {
      const durationMinutes = Number(body.durationMinutes);
      if (Number.isNaN(durationMinutes) || durationMinutes < 10) {
        return NextResponse.json({ message: 'Duração inválida.' }, { status: 400 });
      }
      data.durationMinutes = durationMinutes;
    }
    if (typeof body.active === 'boolean') data.active = body.active;

    const updated = await prisma.service.update({
      where: { id: service.id },
      data,
    });

    return NextResponse.json({ service: updated });
  } catch {
    return NextResponse.json({ message: 'Não foi possível atualizar o serviço.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const service = await prisma.service.findFirst({
    where: { id: params.id, companyId: sessionUser.companyId },
  });

  if (!service) {
    return NextResponse.json({ message: 'Serviço não encontrado.' }, { status: 404 });
  }

  const appointmentsCount = await prisma.appointment.count({ where: { serviceId: service.id } });

  if (appointmentsCount > 0) {
    const updated = await prisma.service.update({ where: { id: service.id }, data: { active: false } });
    return NextResponse.json({ message: 'Serviço possui agendamentos e foi apenas desativado.', service: updated });
  }

  await prisma.service.delete({ where: { id: service.id } });
  return NextResponse.json({ message: 'Serviço removido.' });
}
