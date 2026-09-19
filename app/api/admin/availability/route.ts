import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const businessHours = await prisma.businessHour.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { dayOfWeek: 'asc' },
  });

  const blockedTimes = await prisma.blockedTime.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ businessHours, blockedTimes });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const days = Array.isArray(body.days) ? body.days : [];

    for (const day of days) {
      const dayOfWeek = Number(day.dayOfWeek);
      const openingTime = String(day.openingTime ?? '');
      const closingTime = String(day.closingTime ?? '');
      const active = Boolean(day.active);
      const rawBreakStart = String(day.breakStart ?? '');
      const rawBreakEnd = String(day.breakEnd ?? '');
      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      const hasBreak = timePattern.test(rawBreakStart) && timePattern.test(rawBreakEnd) && rawBreakEnd > rawBreakStart;
      const breakStart = hasBreak ? rawBreakStart : null;
      const breakEnd = hasBreak ? rawBreakEnd : null;

      if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
      if (!/^\d{2}:\d{2}$/.test(openingTime) || !/^\d{2}:\d{2}$/.test(closingTime)) continue;

      const existing = await prisma.businessHour.findFirst({
        where: { companyId: sessionUser.companyId, dayOfWeek },
      });

      if (existing) {
        await prisma.businessHour.update({
          where: { id: existing.id },
          data: { openingTime, closingTime, active, breakStart, breakEnd },
        });
      } else {
        await prisma.businessHour.create({
          data: { companyId: sessionUser.companyId, dayOfWeek, openingTime, closingTime, active, breakStart, breakEnd },
        });
      }
    }

    const businessHours = await prisma.businessHour.findMany({
      where: { companyId: sessionUser.companyId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({ businessHours });
  } catch {
    return NextResponse.json({ message: 'Não foi possível atualizar a disponibilidade.' }, { status: 500 });
  }
}
