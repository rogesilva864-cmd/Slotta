import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const price = Number(body.price ?? 0);
    const durationMinutes = Number(body.durationMinutes ?? 30);

    if (!name || Number.isNaN(price) || Number.isNaN(durationMinutes)) {
      return NextResponse.json({ message: 'Dados inválidos para criar o serviço.' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        companyId: sessionUser.companyId,
        name,
        description: description || null,
        price,
        durationMinutes,
        active: true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Não foi possível criar o serviço.' }, { status: 500 });
  }
}
