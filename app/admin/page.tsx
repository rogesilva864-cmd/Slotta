import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { AdminApp } from '@/components/admin/admin-app';
import { SubscriptionGate } from '@/components/admin/subscription-gate';
import { PLAN_LABEL, hasBillingAccess, trialDaysLeft } from '@/lib/billing';

export default async function AdminPage({ searchParams }: { searchParams: { agendamento?: string } }) {
  const sessionUser = await getSessionUser();
  // Vindo de uma notificação: abre a aba Agendamentos já no agendamento.
  const focusAppointmentId =
    typeof searchParams.agendamento === 'string' && /^[a-z0-9_-]{6,40}$/i.test(searchParams.agendamento) ? searchParams.agendamento : null;

  if (!sessionUser) {
    // Guarda o destino para voltar a ele depois do login.
    redirect(focusAppointmentId ? `/admin/login?next=${encodeURIComponent(`/admin?agendamento=${focusAppointmentId}`)}` : '/admin/login');
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
      focusAppointmentId={focusAppointmentId}
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
