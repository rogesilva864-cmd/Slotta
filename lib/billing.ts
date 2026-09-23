import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const TRIAL_DAYS = 14;
export const PLAN_LABEL = 'Plano Slotta — R$ 59,90/mês';

/** Status que ainda dão acesso ao painel mesmo sem pagamento em dia agora mesmo (o Stripe tenta cobrar de novo automaticamente). */
const GRACE_STATUSES = ['active', 'past_due'];

let cachedClient: Stripe | null | undefined;

export function getStripeClient(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;
  const key = process.env.STRIPE_SECRET_KEY;
  cachedClient = key ? new Stripe(key) : null;
  return cachedClient;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function trialEndsAtFromNow() {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export type SubscriptionCompany = {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
};

/** Empresas cadastradas antes do sistema de cobrança existir (trial sem prazo) nunca são bloqueadas por aqui. */
export function hasBillingAccess(company: SubscriptionCompany) {
  if (GRACE_STATUSES.includes(company.subscriptionStatus)) return true;
  if (company.subscriptionStatus === 'trial') {
    if (!company.trialEndsAt) return true;
    return company.trialEndsAt.getTime() > Date.now();
  }
  return false;
}

export function trialDaysLeft(company: SubscriptionCompany) {
  if (company.subscriptionStatus !== 'trial' || !company.trialEndsAt) return null;
  const msLeft = company.trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

/** Cria uma sessão de checkout do Stripe para a empresa assinar o plano. Devolve a URL para redirecionar o navegador. */
export async function createCheckoutSession(params: { companyId: string; customerEmail: string; existingStripeCustomerId: string | null }) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Pagamentos ainda não configurados. Tente novamente mais tarde.');

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error('Pagamentos ainda não configurados. Tente novamente mais tarde.');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ...(params.existingStripeCustomerId
      ? { customer: params.existingStripeCustomerId }
      : { customer_email: params.customerEmail }),
    client_reference_id: params.companyId,
    subscription_data: { metadata: { companyId: params.companyId } },
    success_url: `${appUrl()}/admin?billing=success`,
    cancel_url: `${appUrl()}/admin?billing=cancelled`,
  });

  if (!session.url) throw new Error('Não foi possível iniciar o pagamento.');
  return session.url;
}

/** Cria uma sessão do portal do Stripe, onde o dono troca o cartão, vê faturas ou cancela. */
export async function createPortalSession(stripeCustomerId: string) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Pagamentos ainda não configurados. Tente novamente mais tarde.');

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl()}/admin`,
  });

  return session.url;
}

async function syncSubscription(subscription: Stripe.Subscription, companyIdHint?: string) {
  const companyId = companyIdHint ?? subscription.metadata?.companyId;
  // Desde a versão mais recente da API do Stripe, current_period_end fica no item da assinatura, não mais na assinatura em si.
  const periodEndSeconds = subscription.items.data[0]?.current_period_end;
  const currentPeriodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000) : null;

  if (companyId) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd,
      },
    });
    return;
  }

  // Sem companyId (ex: evento chegou antes do checkout.session.completed): localiza pela assinatura já salva.
  await prisma.company.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { subscriptionStatus: subscription.status, currentPeriodEnd },
  });
}

/** Aplica um evento de webhook do Stripe ao banco. Ignora eventos que não usamos. */
export async function applyStripeEvent(event: Stripe.Event) {
  const stripe = getStripeClient();
  if (!stripe) return;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = session.client_reference_id;
      if (!companyId || typeof session.subscription !== 'string') break;
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await syncSubscription(subscription, companyId);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      break;
    }
    default:
      break;
  }
}
