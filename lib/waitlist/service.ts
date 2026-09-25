import { prisma } from '@/lib/prisma';
import { brazilNowParts, getAvailableSlots } from '@/lib/availability';
import { sendWhatsappMessage } from '@/lib/whatsapp';
import { sendWaitlistAvailableEmail } from '@/lib/mailer';

const MAX_DAYS_AHEAD = 60;
const MAX_ACTIVE_PER_PHONE = 5;
/** Quantas pessoas são avisadas de cada vez; o restante da fila espera a próxima rodada. */
const WAVE_SIZE = 2;
const WAVE_COOLDOWN_MS = 30 * 60_000;
const MAX_PER_RUN = 20;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function addDays(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function formatDateBr(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/** O dia só aceita lista de espera se a empresa atenderia nele (há expediente) e hoje não há nenhum horário livre. */
export async function isWaitlistOpen(companyId: string, serviceId: string, date: string) {
  const free = await getAvailableSlots(companyId, serviceId, date);
  if (free.length > 0) return false;
  const base = await getAvailableSlots(companyId, serviceId, date, new Date(), { ignoreBookings: true });
  return base.length > 0;
}

export type JoinWaitlistResult =
  | { ok: false; message: string; status: number }
  | { ok: true; message: string; alreadyOnList: boolean };

export async function joinWaitlist(params: {
  companyId: string;
  serviceId: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string;
}): Promise<JoinWaitlistResult> {
  const { companyId, serviceId, customerName, phone, date } = params;
  const email = params.email?.trim() || null;
  const phoneDigits = phone.replace(/\D/g, '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    return { ok: false, message: 'Data inválida.', status: 400 };
  }
  if (phoneDigits.length < 10) {
    return { ok: false, message: 'Informe um telefone com DDD.', status: 400 };
  }

  const today = brazilNowParts().date;
  if (date < today) return { ok: false, message: 'Essa data já passou.', status: 400 };
  if (date > addDays(today, MAX_DAYS_AHEAD)) {
    return { ok: false, message: 'Escolha uma data mais próxima.', status: 400 };
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, companyId, active: true } });
  if (!service) return { ok: false, message: 'Serviço não encontrado ou inativo.', status: 404 };

  if (!(await isWaitlistOpen(companyId, serviceId, date))) {
    const hasFree = (await getAvailableSlots(companyId, serviceId, date)).length > 0;
    return {
      ok: false,
      message: hasFree ? 'Já existem horários livres nesse dia. Escolha um deles para agendar.' : 'A empresa não atende nesse dia.',
      status: 409,
    };
  }

  const existing = await prisma.waitlistEntry.findUnique({
    where: { companyId_serviceId_date_phoneDigits: { companyId, serviceId, date, phoneDigits } },
  });

  if (existing?.status === 'WAITING') {
    return { ok: true, message: 'Você já está na lista de espera desse dia. Avisaremos assim que abrir um horário.', alreadyOnList: true };
  }

  if (!existing) {
    const active = await prisma.waitlistEntry.count({ where: { companyId, phoneDigits, date: { gte: today } } });
    if (active >= MAX_ACTIVE_PER_PHONE) {
      return { ok: false, message: 'Você já está em várias listas de espera. Aguarde os avisos antes de entrar em outra.', status: 429 };
    }
  }

  if (existing) {
    // Já tinha sido avisado, mas o horário foi ocupado antes: volta para a fila mantendo a posição original.
    await prisma.waitlistEntry.update({
      where: { id: existing.id },
      data: { status: 'WAITING', notifiedAt: null, channels: null, customerName, phone, ...(email ? { email } : {}) },
    });
  } else {
    await prisma.waitlistEntry.create({
      data: { companyId, serviceId, customerName, phone, phoneDigits, email, date },
    });
    await prisma.notification.create({
      data: {
        companyId,
        title: 'Nova pessoa na lista de espera',
        message: `${customerName} quer ser avisado(a) se abrir horário de ${service.name} em ${formatDateBr(date)}.`,
      },
    });
  }

  return { ok: true, message: 'Pronto! Você está na lista de espera. Avisaremos assim que abrir um horário.', alreadyOnList: false };
}

/** Quem conseguiu agendar não precisa mais esperar por aquele dia. */
export async function clearWaitlistForBooking(params: { companyId: string; phoneDigits: string; date: string }) {
  await prisma.waitlistEntry.deleteMany({ where: params });
}

type EntryWithRelations = Awaited<ReturnType<typeof loadWaitingEntries>>[number];

function loadWaitingEntries() {
  return prisma.waitlistEntry.findMany({
    where: { status: 'WAITING' },
    orderBy: { createdAt: 'asc' },
    include: { company: true, service: true },
  });
}

async function deliver(entry: EntryWithRelations, whatsappEnabled: boolean) {
  const bookingUrl = `${appUrl()}/agendar/${entry.company.slug}?data=${entry.date}&servico=${entry.serviceId}`;
  const channels: string[] = [];

  if (whatsappEnabled) {
    const result = await sendWhatsappMessage({
      to: entry.phone,
      templateType: 'WAITLIST_AVAILABLE',
      variables: {
        customerName: entry.customerName,
        companyName: entry.company.name,
        serviceName: entry.service.name,
        date: formatDateBr(entry.date),
        bookingUrl,
      },
    });
    if (result.success) channels.push('whatsapp');
    else console.warn(`[waitlist] WhatsApp não enviado para a entrada ${entry.id}: ${result.error}`);
  }

  if (entry.email) {
    try {
      const result = await sendWaitlistAvailableEmail(entry.email, {
        customerName: entry.customerName,
        companyName: entry.company.name,
        serviceName: entry.service.name,
        date: entry.date,
        bookingUrl,
      });
      if (result.delivered) channels.push('email');
    } catch (error) {
      console.error(`[waitlist] Falha ao enviar e-mail da entrada ${entry.id}:`, error);
    }
  }

  await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { channels: channels.join(',') || null } });

  if (channels.length === 0) {
    await prisma.notification.create({
      data: {
        companyId: entry.companyId,
        title: 'Avise a pessoa da lista de espera',
        message: `Abriu um horário de ${entry.service.name} em ${formatDateBr(entry.date)} e não conseguimos avisar ${entry.customerName} automaticamente. Chame pelo WhatsApp (${entry.phone}) na aba Lista de espera.`,
      },
    });
  }
}

/**
 * Varre a lista de espera e avisa quem aguarda um dia em que agora há horário
 * livre (por cancelamento, bloqueio removido, mudança de expediente etc.).
 * Avisa em rodadas, por ordem de chegada, para não mandar dezenas de pessoas
 * atrás da mesma vaga. Cada entrada é reivindicada antes do envio, então
 * execuções concorrentes nunca avisam a mesma pessoa duas vezes.
 */
export async function processWaitlist(now = new Date()) {
  const today = brazilNowParts(now).date;
  await prisma.waitlistEntry.deleteMany({ where: { date: { lt: today } } });

  const entries = (await loadWaitingEntries()).filter((entry) => entry.date >= today);
  if (entries.length === 0) return { notified: 0 };

  const groups = new Map<string, EntryWithRelations[]>();
  for (const entry of entries) {
    const key = `${entry.companyId}|${entry.date}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const settingsCache = new Map<string, boolean>();
  let budget = MAX_PER_RUN;
  let notified = 0;

  for (const group of Array.from(groups.values())) {
    if (budget <= 0) break;
    const { companyId, date } = group[0];

    const recentWave = await prisma.waitlistEntry.count({
      where: { companyId, date, status: 'NOTIFIED', notifiedAt: { gt: new Date(now.getTime() - WAVE_COOLDOWN_MS) } },
    });
    if (recentWave > 0) continue;

    if (!settingsCache.has(companyId)) {
      const setting = await prisma.reminderSetting.findUnique({ where: { companyId } });
      settingsCache.set(companyId, Boolean(setting?.enabled));
    }
    const whatsappEnabled = settingsCache.get(companyId) ?? false;

    const hasSlotsByService = new Map<string, boolean>();
    let wave = 0;

    for (const entry of group) {
      if (wave >= WAVE_SIZE || budget <= 0) break;
      if (!entry.service.active) continue;

      if (!hasSlotsByService.has(entry.serviceId)) {
        const slots = await getAvailableSlots(companyId, entry.serviceId, date, now);
        hasSlotsByService.set(entry.serviceId, slots.length > 0);
      }
      if (!hasSlotsByService.get(entry.serviceId)) continue;

      const claimed = await prisma.waitlistEntry.updateMany({
        where: { id: entry.id, status: 'WAITING' },
        data: { status: 'NOTIFIED', notifiedAt: now },
      });
      if (claimed.count === 0) continue;

      wave += 1;
      budget -= 1;
      notified += 1;
      try {
        await deliver(entry, whatsappEnabled);
      } catch (error) {
        console.error(`[waitlist] Erro ao avisar a entrada ${entry.id}:`, error);
      }
    }
  }

  return { notified };
}
