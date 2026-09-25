import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { AdminApp } from '@/components/admin/admin-app';
import { SubscriptionGate } from '@/components/admin/subscription-gate';
import { PLAN_LABEL, hasBillingAccess, trialDaysLeft } from '@/lib/billing';

export default async function AdminPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect('/admin/login');
  }

  if (!hasBillingAccess(sessionUser.company)) {
    return <SubscriptionGate companyName={sessionUser.company.name} planLabel={PLAN_LABEL} />;
  }

  const daysLeft = trialDaysLeft(sessionUser.company);
  const trialEndsAt = sessionUser.company.trialEndsAt;
  const trialWarning = daysLeft !== null && daysLeft <= 3 && trialEndsAt ? { daysLeft, endsAt: trialEndsAt.toISOString() } : null;

  return (
    <AdminApp
      trialWarning={trialWarning}
      company={{
        id: sessionUser.company.id,
        name: sessionUser.company.name,
        slug: sessionUser.company.slug,
      }}
      admin={{
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
      }}
    />
  );
}
