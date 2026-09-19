import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured: boolean | undefined;

function configure() {
  if (configured !== undefined) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contato@slotta.app';

  if (!publicKey || !privateKey) {
    configured = false;
    return configured;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return configured;
}

export function getVapidPublicKey() {
  return configure() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
}

/** Envia o push para todos os aparelhos do usuário e devolve quantos aceitaram. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configure()) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let delivered = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12, urgency: 'high' }
        );
        delivered += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Aparelho desinstalou/revogou a permissão: remove a inscrição morta.
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        } else {
          console.error('[push] Falha ao enviar notificação:', error);
        }
      }
    })
  );

  return delivered;
}
