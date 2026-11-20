import { prisma } from '@/lib/prisma';
import { isBillingExempt } from '@/lib/billing';
import { sendPlatformFirstAppointmentEmail, sendPlatformFirstLoginEmail } from '@/lib/mailer';

/**
 * Avisa o dono da plataforma quando uma empresa cliente usa o Slotta pela
 * primeira vez: primeiro login no painel e primeiro agendamento recebido.
 * Tudo aqui é best-effort: quem chama usa `void ...catch()`, então uma falha
 * nunca atrasa nem derruba o login ou o agendamento.
 */
function platformEmail() {
  return process.env.PLATFORM_NOTIFY_EMAIL || null;
}

function publicUrl(slug: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/agendar/${slug}`;
}

/** Chamar depois de um login bem-sucedido. Marca o primeiro login e avisa uma única vez. */
export async function notifyPlatformIfFirstLogin(company: { id: string; slug: string; name: string; email: string; subscriptionStatus: string; trialEndsAt: Date | null }) {
  if (isBillingExempt(company)) return;
  // updateMany com firstLoginAt null garante que só um login (mesmo simultâneo) ganha a marcação.
  const marked = await prisma.company.updateMany({ where: { id: company.id, firstLoginAt: null }, data: { firstLoginAt: new Date() } });
  if (marked.count !== 1) return;
  const to = platformEmail();
  if (!to) return;
  await sendPlatformFirstLoginEmail(to, { name: company.name, email: company.email, publicUrl: publicUrl(company.slug) });
}

/** Chamar depois de criar um agendamento. Avisa só quando é o primeiro da empresa. */
export async function notifyPlatformIfFirstAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      companyId: true,
      date: true,
      startTime: true,
      service: { select: { name: true } },
      company: { select: { slug: true, name: true, email: true, subscriptionStatus: true, trialEndsAt: true } },
    },
  });
  if (!appointment || isBillingExempt(appointment.company)) return;
  const total = await prisma.appointment.count({ where: { companyId: appointment.companyId } });
  if (total !== 1) return;
  const to = platformEmail();
  if (!to) return;
  await sendPlatformFirstAppointmentEmail(to, {
    name: appointment.company.name,
    email: appointment.company.email,
    serviceName: appointment.service.name,
    date: appointment.date,
    startTime: appointment.startTime,
    publicUrl: publicUrl(appointment.company.slug),
  });
}
