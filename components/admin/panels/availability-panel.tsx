'use client';

import { useEffect, useState } from 'react';
import type { BlockedTimeItem, BusinessHourItem } from '../types';
import { WEEKDAY_LABELS, formatDate } from '../types';

type DayRow = {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  breakStart: string;
  breakEnd: string;
  active: boolean;
};

const DEFAULT_BREAK = { breakStart: '12:00', breakEnd: '13:00' };

function buildWeek(businessHours: BusinessHourItem[]): DayRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = businessHours.find((item) => item.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      openingTime: existing?.openingTime ?? '09:00',
      closingTime: existing?.closingTime ?? '18:00',
      breakStart: existing?.breakStart ?? '',
      breakEnd: existing?.breakEnd ?? '',
      active: existing?.active ?? false,
    };
  });
}

export function AvailabilityPanel() {
  const [week, setWeek] = useState<DayRow[]>(buildWeek([]));
  const [blockedTimes, setBlockedTimes] = useState<BlockedTimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'ok' | 'error' | 'info'>('info');
  const [justSaved, setJustSaved] = useState(false);
  const [blockNotice, setBlockNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [defaultBreak, setDefaultBreak] = useState(DEFAULT_BREAK);
  const [blockForm, setBlockForm] = useState({ date: '', startTime: '', endTime: '', reason: '' });

  const loadData = async () => {
    setLoading(true);
    const response = await fetch('/api/admin/availability');
    const data = await response.json();
    setWeek(buildWeek(Array.isArray(data.businessHours) ? data.businessHours : []));
    setBlockedTimes(Array.isArray(data.blockedTimes) ? data.blockedTimes : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) document.getElementById('save-feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [message]);

  const updateDay = (dayOfWeek: number, patch: Partial<DayRow>) => {
    setWeek((prev) => prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)));
  };

  const applyBreakToAll = () => {
    if (!defaultBreak.breakStart || !defaultBreak.breakEnd || defaultBreak.breakEnd <= defaultBreak.breakStart) {
      setMessageTone('error');
      setMessage('Informe uma pausa válida: o fim precisa ser depois do início.');
      return;
    }
    setWeek((prev) => prev.map((day) => (day.active ? { ...day, ...defaultBreak } : day)));
    setMessageTone('info');
    setMessage('Pausa aplicada a todos os dias abertos. Falta clicar em “Salvar horários” para confirmar.');
  };

  const saveHours = async () => {
    const invalidBreak = week.find((day) => day.active && day.breakStart && day.breakEnd && day.breakEnd <= day.breakStart);
    if (invalidBreak) {
      setMessageTone('error');
      setMessage(`A pausa de ${WEEKDAY_LABELS[invalidBreak.dayOfWeek]} é inválida: o fim precisa ser depois do início.`);
      return;
    }

    setSaving(true);
    setMessage(null);
    setJustSaved(false);
    try {
      const response = await fetch('/api/admin/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: week }),
      });

      if (response.ok) {
        setMessageTone('ok');
        setMessage('Horários salvos com sucesso! Já valem para novos agendamentos.');
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 4000);
      } else {
        setMessageTone('error');
        setMessage('Não foi possível salvar os horários. Tente de novo.');
      }
    } catch {
      setMessageTone('error');
      setMessage('Sem conexão com o servidor. Verifique sua internet e tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedTime = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch('/api/admin/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blockForm),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setBlockForm({ date: '', startTime: '', endTime: '', reason: '' });
      setBlockNotice({ ok: true, text: 'Horário bloqueado com sucesso.' });
      await loadData();
    } else {
      setBlockNotice({ ok: false, text: data.message || 'Não foi possível bloquear o horário.' });
    }
  };

  const removeBlockedTime = async (id: string) => {
    const response = await fetch(`/api/admin/blocked-times/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await loadData();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="card p-5">
        <h2 className="text-xl font-semibold">Horário de funcionamento</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-300">Carregando...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-dashed border-white/15 p-3">
              <p className="text-sm font-medium">Pausa para almoço</p>
              <p className="mt-1 text-xs text-slate-400">Nesse intervalo os clientes não conseguem agendar. Defina uma vez e aplique a todos os dias, ou ajuste dia a dia abaixo.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={defaultBreak.breakStart}
                  onChange={(event) => setDefaultBreak((prev) => ({ ...prev, breakStart: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm"
                />
                <span className="text-sm text-slate-400">até</span>
                <input
                  type="time"
                  value={defaultBreak.breakEnd}
                  onChange={(event) => setDefaultBreak((prev) => ({ ...prev, breakEnd: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={applyBreakToAll} className="btn-secondary !px-4 !py-2 text-sm">
                  Aplicar a todos os dias abertos
                </button>
              </div>
            </div>

            {week.map((day) => (
              <div key={day.dayOfWeek} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={day.active}
                    onChange={(event) => updateDay(day.dayOfWeek, { active: event.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950"
                  />
                  {WEEKDAY_LABELS[day.dayOfWeek]}
                </label>
                <input
                  type="time"
                  value={day.openingTime}
                  onChange={(event) => updateDay(day.dayOfWeek, { openingTime: event.target.value })}
                  disabled={!day.active}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm disabled:opacity-40"
                />
                <span className="text-center text-sm text-slate-400">até</span>
                <input
                  type="time"
                  value={day.closingTime}
                  onChange={(event) => updateDay(day.dayOfWeek, { closingTime: event.target.value })}
                  disabled={!day.active}
                  className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm disabled:opacity-40"
                />
              </div>

              {day.active ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2 text-sm">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(day.breakStart && day.breakEnd)}
                      onChange={(event) => updateDay(day.dayOfWeek, event.target.checked ? { ...DEFAULT_BREAK } : { breakStart: '', breakEnd: '' })}
                      className="h-4 w-4 rounded border-white/20 bg-slate-950"
                    />
                    Pausa
                  </label>
                  {day.breakStart && day.breakEnd ? (
                    <>
                      <input
                        type="time"
                        value={day.breakStart}
                        onChange={(event) => updateDay(day.dayOfWeek, { breakStart: event.target.value })}
                        className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm"
                      />
                      <span className="text-slate-400">até</span>
                      <input
                        type="time"
                        value={day.breakEnd}
                        onChange={(event) => updateDay(day.dayOfWeek, { breakEnd: event.target.value })}
                        className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5 text-sm"
                      />
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">sem pausa</span>
                  )}
                </div>
              ) : null}
              </div>
            ))}

            <button type="button" onClick={saveHours} disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? 'Salvando...' : justSaved ? '✓ Salvo!' : 'Salvar horários'}
            </button>
            {message ? (
              <p
                id="save-feedback"
                role="status"
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  messageTone === 'ok'
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                    : messageTone === 'error'
                      ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
                      : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-semibold">Bloqueios de horário</h2>
        <div className="mt-4 space-y-3">
          {blockedTimes.length === 0 ? <p className="text-sm text-slate-300">Nenhum bloqueio cadastrado.</p> : null}
          {blockedTimes.map((blockedTime) => (
            <div key={blockedTime.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <strong>{formatDate(blockedTime.date)}</strong>
                <button type="button" onClick={() => removeBlockedTime(blockedTime.id)} className="text-sm font-medium text-rose-300 hover:underline">
                  Remover
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-300">{blockedTime.startTime} - {blockedTime.endTime}</p>
              {blockedTime.reason ? <p className="mt-1 text-xs text-slate-400">{blockedTime.reason}</p> : null}
            </div>
          ))}
        </div>

        <form onSubmit={addBlockedTime} className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <h3 className="text-base font-semibold">Novo bloqueio</h3>
          <input
            type="date"
            value={blockForm.date}
            onChange={(event) => setBlockForm((prev) => ({ ...prev, date: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="time"
              value={blockForm.startTime}
              onChange={(event) => setBlockForm((prev) => ({ ...prev, startTime: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
              required
            />
            <input
              type="time"
              value={blockForm.endTime}
              onChange={(event) => setBlockForm((prev) => ({ ...prev, endTime: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
              required
            />
          </div>
          <input
            value={blockForm.reason}
            onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
            placeholder="Motivo (opcional)"
          />
          <button type="submit" className="btn-primary w-full">Bloquear horário</button>
          {blockNotice ? (
            <p role="status" className={`text-sm font-medium ${blockNotice.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
              {blockNotice.text}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
