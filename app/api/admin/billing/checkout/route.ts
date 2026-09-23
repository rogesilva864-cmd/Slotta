import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createCheckoutSession } from '@/lib/billing';

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const url = await createCheckoutSession({
      companyId: sessionUser.companyId,
      customerEmail: sessionUser.email,
      existingStripeCustomerId: sessionUser.company.stripeCustomerId,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('[billing/checkout] erro:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Não foi possível iniciar o pagamento.' }, { status: 500 });
  }
}
