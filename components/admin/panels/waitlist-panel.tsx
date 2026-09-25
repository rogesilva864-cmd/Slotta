'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDate, whatsappLink } from '../types';

type WaitlistItem = {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;
  date: string;
  status: string;
  notifiedAt: string | null;
  channels: string | null;
  service: { name: string };
};

function statusInfo(entry: WaitlistItem) {
  if (entry.status !== 'NOTIFIED') return { label: 'Aguardando vaga', className: 'status-pending' };
  const time = entry.notifiedAt
    ? new Date(entry.notifiedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : '';
  const by = entry.channels ? (entry.channels.includes('whatsapp') && entry.channels.includes('email') ? 'e-mail e WhatsApp' : entry.channels.includes('whatsapp') ? 'WhatsApp' : 'e-mail') : null;
  return {
    label: by ? `Avisado às ${time} (${by})` : `Não foi possível avisar (${time})`,
    className: by ? 'status-confirmed' : 'status-rejected',
  };
}

export function WaitlistPanel() {
  const [entries, setEntries] = useState<WaitlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/waitlist');
    const data = await response.json();
    setEntries(Array.isArray(data.entries) ? data.entries : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm('Remover esta pessoa da lista de espera?')) return;
    await fetch(`/api/admin/waitlist/${id}`, { method: 'DELETE' });
    await load();
  };

  const byDate = entries.reduce<Record<string, WaitlistItem[]>>((groups, entry) => {
    (groups[entry.date] ??= []).push(entry);
    return groups;
  }, {});

  return (
    <div className="card p-5">
      <h2 className="text-xl font-semibold">Lista de espera</h2>
      <p className="mt-1 text-sm text-slate-300">
        Quando um dia está lotado, o cliente pode pedir para ser avisado. Se um horário abrir (cancelamento, bloqueio removido), avisamos automaticamente por ordem de chegada, por e-mail e WhatsApp.
      </p>

      <div className="mt-5 space-y-5">
        {loading ? <p className="text-sm text-slate-300">Carregando lista...</p> : null}
        {!loading && entries.length === 0 ? <p className="text-sm text-slate-300">Ninguém na lista de espera no momento.</p> : null}

        {Object.entries(byDate).map(([date, items]) => (
          <section key={date}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">{formatDate(date)}</h3>
            <div className="mt-2 space-y-3">
              {items.map((entry) => {
                const info = statusInfo(entry);
                return (
                  <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{entry.customerName}</strong>
                      <span className={`status-pill ${info.className}`}>{info.label}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {entry.service.name} · {entry.phone}
                      {entry.email ? ` · ${entry.email}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <a
                        href={whatsappLink(entry.phone, `Olá, ${entry.customerName}! Abriu um horário de ${entry.service.name} no dia ${formatDate(entry.date)}. Quer agendar?`)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-100 hover:underline"
                      >
                        Chamar no WhatsApp
                      </a>
                      <button type="button" onClick={() => remove(entry.id)} className="font-medium text-rose-300 hover:underline">
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
