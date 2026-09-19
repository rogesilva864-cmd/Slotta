import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { getVapidPublicKey } from '@/lib/push';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const subscribedDevices = await prisma.pushSubscription.count({ where: { userId: sessionUser.id } });

  return NextResponse.json({ publicKey: getVapidPublicKey(), subscribedDevices });
}
