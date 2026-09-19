'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarOff } from 'lucide-react';
import type { BlockedTimeItem } from './types';
import { CANCEL_REASON_DEFAULT, ManualContactList, channelLabel, requestCancel, type ManualContact } from './cancel-helpers';

type Conflict = { id: string; date: string; customerName: string; customerPhone: string; startTime: string };

type Slot = { date: string; startTime: string; endTime: string } | null;

const WHOLE_DAY_END = '23:59';

function brazilNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function formatTime(totalMinutes: number) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function nextQuarterHour(minutes: number) {
  return Math.ceil(minutes / 15) * 15;
}

function untilEndOfDay(hoursAhead: number | null): Slot {
  const now = brazilNow();
  const start = nextQuarterHour(now.minutes);
  if (start >= 23 * 60 + 45) return null;
  const end = hoursAhead === null ? 23 * 60 + 59 : Math.min(start + hoursAhead * 60, 23 * 60 + 59);
  return { date: now.date, startTime: formatTime(start), endTime: formatTime(end) };
}

const PRESETS: { id: string; label: string; build: () => Slot }[] = [
  { id: '1h', label: 'Próxima 1 hora', build: () => untilEndOfDay(1) },
  { id: '2h', label: 'Próximas 2 horas', build: () => untilEndOfDay(2) },
  { id: 'rest', label: 'Resto de hoje', build: () => untilEndOfDay(null) },
  { id: 'today', label: 'Hoje, dia todo', build: () => ({ date: brazilNow().date, startTime: '00:00', endTime: WHOLE_DAY_END }) },
  { id: 'tomorrow', label: 'Amanhã, dia todo', build: () => ({ date: addDays(brazilNow().date, 1), startTime: '00:00', endTime: WHOLE_DAY_END }) },
];

function describeBlock(block: BlockedTimeItem, today: string) {
  const [, month, day] = block.date.split('-');
  const dayLabel = block.date === today ? 'Hoje' : block.date === addDays(today, 1) ? 'Amanhã' : `${day}/${month}`;
  const wholeDay = block.startTime === '00:00' && block.endTime === WHOLE_DAY_END;
  return `${dayLabel} · ${wholeDay ? 'dia todo' : `${block.startTime} às ${block.endTime}`}`;
}

export function QuickBlockCard({ onOpenAvailability, onChanged }: { onOpenAvailability: () => void; onChanged?: () => void }) {
  const [blocks, setBlocks] = useState<BlockedTimeItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [manualContacts, setManualContacts] = useState<ManualContact[]>([]);

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/availability');
    if (!response.ok) return;
    const data = await response.json();
    const today = brazilNow().date;
    const upcoming = (Array.isArray(data.blockedTimes) ? (data.blockedTimes as BlockedTimeItem[]) : [])
      .filter((block) => block.date >= today)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    setBlocks(upcoming);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const block = async (slot: Slot) => {
    if (!slot) return;
    setBusy(true);
    setMessage(null);
    setConflicts([]);
    setConfirmingCancel(false);
    setManualContacts([]);
    try {
      const response = await fetch('/api/admin/blocked-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slot, reason: 'Bloqueio rápido' }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ tone: 'error', text: data.message || 'Não foi possível bloquear.' });
        return;
      }

      const found = Array.isArray(data.conflicts) ? (data.conflicts as Conflict[]) : [];
      if (found.length > 0) {
        setConflicts(found);
        setMessage({
          tone: 'warn',
          text: `Horário bloqueado, mas você já tem ${found.length} agendamento(s) nesse período. Os clientes ainda não sabem do imprevisto.`,
        });
      } else {
        setMessage({ tone: 'ok', text: 'Horário bloqueado. Novos clientes não conseguem mais agendar nesse período.' });
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const cancelConflicts = async () => {
    setBusy(true);
    setConfirmingCancel(false);
    const notified: string[] = [];
    const manual: ManualContact[] = [];
    let failed = 0;

    for (const item of conflicts) {
      const outcome = await requestCancel(item.id, CANCEL_REASON_DEFAULT);
      if (!outcome.ok) {
        failed += 1;
        continue;
      }
      if (outcome.needsManualContact) manual.push({ name: item.customerName, phone: item.customerPhone, date: item.date, startTime: item.startTime });
      else notified.push(`${item.customerName} (${channelLabel(outcome.notifiedBy)})`);
    }

    setConflicts([]);
    setManualContacts(manual);
    const parts = [`${conflicts.length - failed} agendamento(s) cancelado(s).`];
    if (notified.length > 0) parts.push(`Avisados automaticamente: ${notified.join(', ')}.`);
    if (failed > 0) parts.push(`${failed} não puderam ser cancelados (já terminaram ou foram encerrados).`);
    setMessage({ tone: manual.length > 0 || failed > 0 ? 'warn' : 'ok', text: parts.join(' ') });
    setBusy(false);
    onChanged?.();
  };

  const unblock = async (id: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/blocked-times/${id}`, { method: 'DELETE' });
      if (response.ok) setMessage({ tone: 'ok', text: 'Horário liberado de novo.' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const today = brazilNow().date;
  const toneClass = message?.tone === 'error' ? 'text-rose-300' : message?.tone === 'warn' ? 'text-amber-200' : 'text-emerald-300';

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
          <CalendarOff size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Bloqueio rápido</h2>
          <p className="mt-1 text-sm text-slate-300">Imprevisto, folga ou almoço? Toque para impedir novos agendamentos no período.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {PRESETS.map((preset) => {
          const slot = preset.build();
          return (
            <button key={preset.id} type="button" className="btn-secondary !px-3 !py-3 text-sm" disabled={busy || slot === null} onClick={() => block(slot)}>
              {preset.label}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onOpenAvailability} className="mt-3 text-sm font-medium text-brand-100 hover:underline">
        Bloqueio personalizado (escolher data e horário)
      </button>

      {message ? (
        <p className={`mt-3 text-sm ${toneClass}`} role="status">
          {message.text}
        </p>
      ) : null}

      {conflicts.length > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm">
          <ul className="space-y-1">
            {conflicts.map((item) => (
              <li key={item.id}>
                {item.customerName} · {item.date.split('-').reverse().slice(0, 2).join('/')} às {item.startTime}
              </li>
            ))}
          </ul>
          {confirmingCancel ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-medium">Cancelar {conflicts.length} agendamento(s) e avisar os clientes agora?</span>
              <button type="button" className="btn-primary !px-4 !py-2 text-sm" disabled={busy} onClick={cancelConflicts}>
                Sim, cancelar e avisar
              </button>
              <button type="button" className="btn-secondary !px-4 !py-2 text-sm" disabled={busy} onClick={() => setConfirmingCancel(false)}>
                Voltar
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-primary !px-4 !py-2 text-sm" disabled={busy} onClick={() => setConfirmingCancel(true)}>
                Cancelar e avisar os clientes
              </button>
              <button type="button" className="btn-secondary !px-4 !py-2 text-sm" disabled={busy} onClick={() => setConflicts([])}>
                Manter os agendamentos
              </button>
            </div>
          )}
        </div>
      ) : null}

      <ManualContactList contacts={manualContacts} />

      {blocks.length > 0 ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bloqueios ativos</p>
          <ul className="mt-3 space-y-2">
            {blocks.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <span>{describeBlock(item, today)}</span>
                <button type="button" className="font-semibold text-cyan-300 hover:underline disabled:opacity-60" disabled={busy} onClick={() => unblock(item.id)}>
                  Desbloquear
                </button>
              </li>
            ))}
          </ul>
          {blocks.length > 6 ? (
            <button type="button" onClick={onOpenAvailability} className="mt-2 text-sm text-slate-400 hover:underline">
              + {blocks.length - 6} outros bloqueios
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
