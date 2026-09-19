import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const settingsSchema = z.object({
  notifyEmailFallback: z.boolean().optional(),
  notifyDailyDigest: z.boolean().optional(),
});

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  return NextResponse.json({
    notifyEmailFallback: sessionUser.notifyEmailFallback,
    notifyDailyDigest: sessionUser.notifyDailyDigest,
    email: sessionUser.email,
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: sessionUser.id }, data: parsed.data });
  return NextResponse.json({ message: 'Preferências salvas.' });
}
