import { prisma } from '@/lib/prisma';
import { sendTrialEndingEmail, sendTrialExpiredEmail } from '@/lib/mailer';

const DAY_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS_STAGE = 1;
const LAST_DAY_STAGE = 2;
const EXPIRED_STAGE = 3;
/** Testes que expiraram há mais que isso não recebem o aviso (evita e-mails antigos e fora de hora). */
const EXPIRED_NOTICE_WINDOW_MS = 3 * DAY_MS;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Avisa o dono por e-mail sobre o fim do teste grátis: faltando 3 dias, nas
 * últimas 24h e quando o teste termina. O estágio é gravado antes do envio
 * (com troca condicional), então execuções concorrentes ou reinícios nunca
 * mandam o mesmo aviso duas vezes. Empresas sem prazo (anteriores à
 * cobrança) e quem já assinou ficam de fora.
 */
export async function processTrialNotices(now = new Date()) {
  const companies = await prisma.company.findMany({
    where: {
      subscriptionStatus: 'trial',
      stripeSubscriptionId: null,
      OR: [
        { trialEndsAt: { gt: now, lte: new Date(now.getTime() + 3 * DAY_MS) }, trialNoticeStage: { lt: LAST_DAY_STAGE } },
        { trialEndsAt: { lte: now, gt: new Date(now.getTime() - EXPIRED_NOTICE_WINDOW_MS) }, trialNoticeStage: { lt: EXPIRED_STAGE } },
      ],
    },
    include: { users: { select: { name: true, email: true } } },
  });

  let sent = 0;

  for (const company of companies) {
    if (!company.trialEndsAt) continue;
    const msLeft = company.trialEndsAt.getTime() - now.getTime();
    const expired = msLeft <= 0;
    const targetStage = expired ? EXPIRED_STAGE : msLeft <= DAY_MS ? LAST_DAY_STAGE : THREE_DAYS_STAGE;
    if (company.trialNoticeStage >= targetStage) continue;

    const claimed = await prisma.company.updateMany({
      where: { id: company.id, trialNoticeStage: { lt: targetStage } },
      data: { trialNoticeStage: targetStage },
    });
    if (claimed.count === 0) continue;

    const recipients = company.users.length > 0 ? company.users : [{ name: company.name, email: company.email }];
    const endsAtLabel = company.trialEndsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const daysLeft = Math.max(1, Math.ceil(msLeft / DAY_MS));
    const panelUrl = `${appUrl()}/admin`;

    for (const recipient of recipients) {
      try {
        const result = expired
          ? await sendTrialExpiredEmail(recipient.email, { adminName: recipient.name, companyName: company.name, panelUrl })
          : await sendTrialEndingEmail(recipient.email, { adminName: recipient.name, companyName: company.name, daysLeft, endsAtLabel, panelUrl });
        if (result.delivered) sent += 1;
      } catch (error) {
        console.error(`[trial-notices] Falha ao enviar e-mail para a empresa ${company.id}:`, error);
      }
    }
  }

  return { companies: companies.length, sent };
}
