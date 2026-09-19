import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
});

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Inscrição inválida.' }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get('user-agent')?.slice(0, 255) ?? null;

  // O mesmo aparelho pode trocar de usuário: o endpoint é único e passa a pertencer a quem acabou de ativar.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: sessionUser.id, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    create: { userId: sessionUser.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  return NextResponse.json({ message: 'Notificações ativadas neste aparelho.' });
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== 'string') {
    return NextResponse.json({ message: 'Inscrição inválida.' }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: sessionUser.id } });
  return NextResponse.json({ message: 'Notificações desativadas neste aparelho.' });
}
