import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const REVENUE_STATUSES = ['CONFIRMED', 'COMPLETED'];

/** Primeiro e último dia (AAAA-MM-DD) do mês atual no horário de Brasília. */
function currentMonthRangeBrazil() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')!.value;
  const month = parts.find((part) => part.type === 'month')!.value;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Números do dashboard, calculados no banco (contagens/somas) em vez de
 * baixar o histórico inteiro de agendamentos para o navegador — mais rápido
 * e não cresce conforme a empresa acumula anos de uso.
 */
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const companyId = sessionUser.companyId;
  const { start, end } = currentMonthRangeBrazil();

  const [totalAppointments, pending, confirmed, monthRevenue, recentAppointments] = await Promise.all([
    prisma.appointment.count({ where: { companyId } }),
    prisma.appointment.count({ where: { companyId, status: 'PENDING' } }),
    prisma.appointment.count({ where: { companyId, status: { in: REVENUE_STATUSES } } }),
    prisma.appointment.aggregate({
      where: { companyId, status: { in: REVENUE_STATUSES }, date: { gte: start, lte: end } },
      _sum: { price: true },
    }),
    prisma.appointment.findMany({
      where: { companyId },
      include: { service: { select: { name: true } }, customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    totalAppointments,
    pending,
    confirmed,
    billingThisMonth: monthRevenue._sum.price ?? 0,
    recentAppointments,
  });
}
