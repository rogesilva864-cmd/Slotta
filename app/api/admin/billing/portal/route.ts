import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createPortalSession } from '@/lib/billing';

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  if (!sessionUser.company.stripeCustomerId) {
    return NextResponse.json({ message: 'Você ainda não tem uma assinatura ativa.' }, { status: 400 });
  }

  try {
    const url = await createPortalSession(sessionUser.company.stripeCustomerId);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('[billing/portal] erro:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Não foi possível abrir o portal de pagamento.' }, { status: 500 });
  }
}
