import { prisma } from '@/lib/prisma';
import { sendTrialEndingEmail } from '@/lib/mailer';

const DAY_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS_STAGE = 1;
const LAST_DAY_STAGE = 2;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Avisa o dono por e-mail quando o teste grátis está acabando: uma vez faltando
 * 3 dias e outra nas últimas 24h. O estágio é gravado antes do envio (com
 * troca condicional), então execuções concorrentes ou reinícios nunca mandam
 * o mesmo aviso duas vezes. Empresas sem prazo (anteriores à cobrança) e quem
 * já assinou ficam de fora.
 */
export async function processTrialNotices(now = new Date()) {
  const companies = await prisma.company.findMany({
    where: {
      subscriptionStatus: 'trial',
      stripeSubscriptionId: null,
      trialEndsAt: { gt: now, lte: new Date(now.getTime() + 3 * DAY_MS) },
      trialNoticeStage: { lt: LAST_DAY_STAGE },
    },
    include: { users: { select: { name: true, email: true } } },
  });

  let sent = 0;

  for (const company of companies) {
    if (!company.trialEndsAt) continue;
    const msLeft = company.trialEndsAt.getTime() - now.getTime();
    const targetStage = msLeft <= DAY_MS ? LAST_DAY_STAGE : THREE_DAYS_STAGE;
    if (company.trialNoticeStage >= targetStage) continue;

    const claimed = await prisma.company.updateMany({
      where: { id: company.id, trialNoticeStage: { lt: targetStage } },
      data: { trialNoticeStage: targetStage },
    });
    if (claimed.count === 0) continue;

    const recipients = company.users.length > 0 ? company.users : [{ name: company.name, email: company.email }];
    const endsAtLabel = company.trialEndsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const daysLeft = Math.max(1, Math.ceil(msLeft / DAY_MS));

    for (const recipient of recipients) {
      try {
        const result = await sendTrialEndingEmail(recipient.email, {
          adminName: recipient.name,
          companyName: company.name,
          daysLeft,
          endsAtLabel,
          panelUrl: `${appUrl()}/admin`,
        });
        if (result.delivered) sent += 1;
      } catch (error) {
        console.error(`[trial-notices] Falha ao enviar e-mail para a empresa ${company.id}:`, error);
      }
    }
  }

  return { companies: companies.length, sent };
}
