'use client';

import { whatsappLink } from './types';

export type ManualContact = { name: string; phone: string; date: string; startTime: string };

export type CancelOutcome = {
  ok: boolean;
  message: string;
  customerName: string;
  customerPhone: string;
  notifiedBy: string[];
  needsManualContact: boolean;
};

export const CANCEL_REASON_DEFAULT = 'Imprevisto do profissional.';

export async function requestCancel(appointmentId: string, reason: string): Promise<CancelOutcome> {
  const response = await fetch(`/api/admin/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    message: data.message ?? 'Não foi possível cancelar.',
    customerName: data.customerName ?? '',
    customerPhone: data.customerPhone ?? '',
    notifiedBy: Array.isArray(data.notifiedBy) ? data.notifiedBy : [],
    needsManualContact: Boolean(data.needsManualContact),
  };
}

export function channelLabel(channels: string[]) {
  const names = channels.map((channel) => (channel === 'whatsapp' ? 'WhatsApp' : 'e-mail'));
  return names.join(' e ');
}

function formatShortDate(date: string) {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

/** Clientes que o Slotta não conseguiu avisar: o dono precisa entrar em contato por conta própria. */
export function ManualContactList({ contacts }: { contacts: ManualContact[] }) {
  if (contacts.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
      <p className="font-semibold text-amber-200">Avise estes clientes por conta própria (o Slotta não conseguiu):</p>
      <ul className="mt-2 space-y-2">
        {contacts.map((contact) => {
          const text = `Olá ${contact.name}, tudo bem? Precisei cancelar seu horário de ${formatShortDate(contact.date)} às ${contact.startTime} por um imprevisto. Peço desculpas! Podemos remarcar?`;
          return (
            <li key={`${contact.phone}-${contact.date}-${contact.startTime}`} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {contact.name} · {formatShortDate(contact.date)} {contact.startTime} · {contact.phone}
              </span>
              <span className="flex gap-3">
                <a className="font-semibold text-cyan-300 hover:underline" href={whatsappLink(contact.phone, text)} target="_blank" rel="noreferrer">
                  Avisar no WhatsApp
                </a>
                <a className="font-semibold text-cyan-300 hover:underline" href={`tel:${contact.phone.replace(/\D/g, '')}`}>
                  Ligar
                </a>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
