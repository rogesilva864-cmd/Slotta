import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, name, description, price, durationMinutes, active = true } = body;

    if (!companyId || !name || !price || !durationMinutes) {
      return NextResponse.json({ message: 'Dados obrigatórios ausentes.' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        companyId,
        name,
        description: description || '',
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        active: Boolean(active),
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Não foi possível criar o serviço.' }, { status: 500 });
  }
}
