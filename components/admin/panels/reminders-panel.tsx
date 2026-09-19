'use client';

import { useEffect, useState } from 'react';
import { formatDate, statusClass } from '../types';
import { OwnerNotificationsCard } from '../owner-notifications-card';
import { ReviewRequestCard } from '../review-request-card';

type IntervalItem = {
  key: string;
  label: string;
  minutesBefore: number;
  active: boolean;
  testOnly: boolean;
};

type RecentReminder = {
  id: string;
  type: string;
  status: string;
  scheduledFor: string;
  sentAt: string | null;
  error: string | null;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
};

type Stats = { pending: number; sent: number; failed: number; cancelled: number; total: number };

export function RemindersPanel() {
  const [enabled, setEnabled] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [intervals, setIntervals] = useState<IntervalItem[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 });
  const [recent, setRecent] = useState<RecentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [settingsResponse, statsResponse] = await Promise.all([
      fetch('/api/admin/reminders/settings'),
      fetch('/api/admin/reminders/stats'),
    ]);
    const settingsData = await settingsResponse.json();
    const statsData = await statsResponse.json();

    setEnabled(Boolean(settingsData.enabled));
    setTestMode(Boolean(settingsData.testMode));
    setIntervals(Array.isArray(settingsData.intervals) ? settingsData.intervals : []);
    setStats(statsData.stats ?? { pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 });
    setRecent(Array.isArray(statsData.recent) ? statsData.recent : []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleInterval = (key: string) => {
    setIntervals((prev) => prev.map((interval) => (interval.key === key ? { ...interval, active: !interval.active } : interval)));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);

    const response = await fetch('/api/admin/reminders/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        testMode,
        intervals: intervals.map((interval) => ({ key: interval.key, active: interval.active })),
      }),
    });

    const data = await response.json();
    setMessage(response.ok ? 'Configurações salvas com sucesso.' : data.message || 'Não foi possível salvar.');
    setSaving(false);
    await loadAll();
  };

  const runNow = async () => {
    setRunning(true);
    setMessage(null);
    const response = await fetch('/api/admin/reminders/run', { method: 'POST' });
    const data = await response.json();
    setMessage(data.message || 'Processamento concluído.');
    setRunning(false);
    await loadAll();
  };

  if (loading) {
    return <p className="text-sm text-slate-300">Carregando configurações de lembretes...</p>;
  }

  const visibleIntervals = intervals.filter((interval) => !interval.testOnly || testMode);

  return (
    <div className="space-y-6">
      <OwnerNotificationsCard />
      <ReviewRequestCard />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card stat-card">
          <p className="text-sm text-slate-300">Enviados</p>
          <p className="mt-3 text-3xl font-bold text-emerald-300">{stats.sent}</p>
        </div>
        <div className="card stat-card">
          <p className="text-sm text-slate-300">Pendentes</p>
          <p className="mt-3 text-3xl font-bold text-amber-300">{stats.pending}</p>
        </div>
        <div className="card stat-card">
          <p className="text-sm text-slate-300">Com erro</p>
          <p className="mt-3 text-3xl font-bold text-rose-300">{stats.failed}</p>
        </div>
        <div className="card stat-card">
          <p className="text-sm text-slate-300">Cancelados</p>
          <p className="mt-3 text-3xl font-bold text-slate-300">{stats.cancelled}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Lembretes por WhatsApp</h2>
              <p className="mt-1 text-sm text-slate-300">Envia confirmações, lembretes e avisos de cancelamento automaticamente.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="peer sr-only" />
              <div className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-brand-500" />
              <div className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
            </label>
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Intervalos ativos</h3>
            {visibleIntervals.map((interval) => (
              <label
                key={interval.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {interval.label}
                  {interval.testOnly ? (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/20">
                      teste
                    </span>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  checked={interval.active}
                  onChange={() => toggleInterval(interval.key)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-950"
                />
              </label>
            ))}

            <label className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3">
              <span className="text-sm text-slate-300">
                Modo de teste (libera um intervalo curto de poucos minutos, para testar sem esperar horas)
              </span>
              <input
                type="checkbox"
                checked={testMode}
                onChange={(event) => setTestMode(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-slate-950"
              />
            </label>
          </div>

          {message ? <p className="mt-4 text-sm text-cyan-200">{message}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </button>
            <button
              type="button"
              onClick={runNow}
              disabled={running}
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-70"
              title="Processa agora os lembretes desta empresa cujo horário já chegou — útil para testar."
            >
              {running ? 'Processando...' : 'Processar agora'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-xl font-semibold">Últimos lembretes</h2>
          <div className="mt-4 space-y-3">
            {recent.length === 0 ? <p className="text-sm text-slate-300">Nenhum lembrete criado ainda.</p> : null}
            {recent.map((reminder) => (
              <div key={reminder.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{reminder.customerName}</strong>
                  <span className={`status-pill ${statusClass(reminder.status)}`}>{reminder.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  {reminder.serviceName} · {formatDate(reminder.appointmentDate)} {reminder.appointmentTime}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Programado: {new Date(reminder.scheduledFor).toLocaleString('pt-BR')}
                  {reminder.sentAt ? ` · Enviado: ${new Date(reminder.sentAt).toLocaleString('pt-BR')}` : ''}
                </p>
                {reminder.error ? <p className="mt-1 text-xs text-rose-300">Erro: {reminder.error}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
