import { sendPlatformNewCompanyEmail, sendPlatformNewSubscriberEmail, sendPlatformSubscriptionCanceledEmail } from '@/lib/mailer';

/**
 * Avisa o dono da plataforma Slotta (não o dono de uma empresa cliente) sobre
 * eventos de negócio: novo cadastro, nova assinatura paga, cancelamento.
 * Sem PLATFORM_NOTIFY_EMAIL configurado, esses avisos não têm para onde ir —
 * sai silenciosamente, sem travar o fluxo principal (registro/webhook).
 */
function platformEmail() {
  return process.env.PLATFORM_NOTIFY_EMAIL || null;
}

export async function notifyPlatformNewCompany(company: { name: string; email: string; slug: string }) {
  const to = platformEmail();
  if (!to) return;
  try {
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/agendar/${company.slug}`;
    await sendPlatformNewCompanyEmail(to, { name: company.name, email: company.email, publicUrl });
  } catch (error) {
    console.error('[platform-notify] Falha ao avisar novo cadastro:', error);
  }
}

export async function notifyPlatformNewSubscriber(company: { name: string; email: string }) {
  const to = platformEmail();
  if (!to) return;
  try {
    await sendPlatformNewSubscriberEmail(to, company);
  } catch (error) {
    console.error('[platform-notify] Falha ao avisar nova assinatura:', error);
  }
}

export async function notifyPlatformSubscriptionCanceled(company: { name: string; email: string }, accessUntilLabel: string) {
  const to = platformEmail();
  if (!to) return;
  try {
    await sendPlatformSubscriptionCanceledEmail(to, { ...company, accessUntilLabel });
  } catch (error) {
    console.error('[platform-notify] Falha ao avisar cancelamento:', error);
  }
}
