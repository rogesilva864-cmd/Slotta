import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { PLAN_LABEL, hasBillingAccess, trialDaysLeft } from '@/lib/billing';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const company = sessionUser.company;

  return NextResponse.json({
    planLabel: PLAN_LABEL,
    status: company.subscriptionStatus,
    hasAccess: hasBillingAccess(company),
    trialDaysLeft: trialDaysLeft(company),
    currentPeriodEnd: company.currentPeriodEnd,
    hasStripeCustomer: Boolean(company.stripeCustomerId),
  });
}
