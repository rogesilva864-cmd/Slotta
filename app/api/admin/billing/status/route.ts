import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { PLAN_LABEL, hasBillingAccess, isBillingExempt, trialDaysLeft } from '@/lib/billing';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const company = sessionUser.company;

  if (isBillingExempt(company)) {
    return NextResponse.json({
      planLabel: PLAN_LABEL,
      status: 'exempt',
      hasAccess: true,
      trialDaysLeft: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      hasStripeCustomer: false,
    });
  }

  return NextResponse.json({
    planLabel: PLAN_LABEL,
    status: company.subscriptionStatus,
    hasAccess: hasBillingAccess(company),
    trialDaysLeft: trialDaysLeft(company),
    currentPeriodEnd: company.currentPeriodEnd,
    cancelAtPeriodEnd: company.cancelAtPeriodEnd,
    hasStripeCustomer: Boolean(company.stripeCustomerId),
  });
}
