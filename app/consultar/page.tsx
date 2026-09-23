'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type AppointmentResult = {
  id: string;
  companyId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string };
  customer: { name: string; phone: string; email?: string | null };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
  NO_SHOW: 'Não compareceu',
};

function isActionable(appointment: AppointmentResult) {
  if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) return false;
  return new Date(`${appointment.date}T${appointment.endTime}:00-03:00`).getTime() > Date.now();
}

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ConsultStatusPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AppointmentResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [mode, setMode] = useState<'idle' | 'confirm-cancel' | 'reschedule'>('idle');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setActionMessage(null);
    setMode('idle');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/appointments?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      const appointments = Array.isArray(data.appointments) ? data.appointments : [];
      const match = appointments[0] ?? null;

      if (!match) {
        setResult(null);
        setError('Nenhum agendamento encontrado para os dados informados.');
        setIsLoading(false);
        return;
      }

      setResult(match);
    } catch {
      setError('Não foi possível consultar o agendamento.');
    } finally {
      setIsLoading(false);
    }
  }

  const cancelAppointment = async () => {
    if (!result) return;
    setBusy(true);
    setActionMessage(null);
    const response = await fetch(`/api/appointments/${result.id}/self-cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: query }),
    });
    const data = await response.json();
    setBusy(false);
    setMode('idle');

    if (!response.ok) {
      setActionMessage({ ok: false, text: data.message || 'Não foi possível cancelar.' });
      return;
    }

    setResult((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
    setActionMessage({ ok: true, text: data.message });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card consultation-card w-full max-w-xl p-6">
        <div className="mb-5 flex items-center justify-center">
          <img src="/logo-agenda.jpeg" alt="Logo Agenda" className="consultation-logo" />
        </div>
        <p className="text-center text-sm uppercase tracking-[0.2em] text-cyan-300">Consulta</p>
        <h1 className="mt-3 text-center text-3xl font-bold">Consulte seu agendamento</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="field">
            <span>Telefone, e-mail ou código</span>
            <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="(11) 99999-9999" required />
          </label>
          <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
            {isLoading ? 'Buscando...' : 'Buscar agendamento'}
          </button>
        </form>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Status:</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{STATUS_LABELS[result.status] ?? result.status}</p>
            <p className="mt-3 text-sm text-slate-300">
              Serviço: {result.service.name} · Data: {formatDateLabel(result.date)} · Horário: {result.startTime}
            </p>
            <div className="mt-4 text-sm text-slate-300">
              <p>Cliente: {result.customer.name}</p>
              <p>Contato: {result.customer.phone}</p>
            </div>

            {isActionable(result) ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                {mode === 'idle' ? (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => setMode('reschedule')} className="btn-secondary text-sm">
                      Remarcar
                    </button>
                    <button type="button" onClick={() => setMode('confirm-cancel')} className="btn-secondary text-sm">
                      Cancelar agendamento
                    </button>
                  </div>
                ) : null}

                {mode === 'confirm-cancel' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-200">Tem certeza que quer cancelar esse agendamento?</p>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" disabled={busy} onClick={cancelAppointment} className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-70">
                        {busy ? 'Cancelando...' : 'Sim, cancelar'}
                      </button>
                      <button type="button" onClick={() => setMode('idle')} className="btn-secondary text-sm">
                        Voltar
                      </button>
                    </div>
                  </div>
                ) : null}

                {mode === 'reschedule' ? (
                  <RescheduleForm
                    appointment={result}
                    contact={query}
                    onCancel={() => setMode('idle')}
                    onDone={(message, ok, updated) => {
                      setActionMessage({ ok, text: message });
                      if (ok && updated) {
                        setResult((prev) => (prev ? { ...prev, ...updated, status: 'PENDING' } : prev));
                        setMode('idle');
                      }
                    }}
                  />
                ) : null}
              </div>
            ) : null}

            {actionMessage ? (
              <p className={`mt-4 text-sm ${actionMessage.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{actionMessage.text}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-slate-300">
          <Link href="/" className="text-brand-100 hover:underline">Voltar ao início</Link>
        </div>
      </div>
    </main>
  );
}

function RescheduleForm({
  appointment,
  contact,
  onCancel,
  onDone,
}: {
  appointment: AppointmentResult;
  contact: string;
  onCancel: () => void;
  onDone: (message: string, ok: boolean, updated?: { date: string; startTime: string; endTime: string }) => void;
}) {
  const dateOptions = useMemo(() => {
    const dates: string[] = [];
    const start = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setSelectedSlot('');
      return;
    }
    const controller = new AbortController();
    setLoadingSlots(true);
    fetch(`/api/availability?companyId=${appointment.companyId}&serviceId=${appointment.serviceId}&date=${selectedDate}`, {
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setSelectedSlot('');
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
    return () => controller.abort();
  }, [appointment.companyId, appointment.serviceId, selectedDate]);

  const confirmReschedule = async () => {
    if (!selectedDate || !selectedSlot) return;
    const startTime = selectedSlot.split(' - ')[0];
    const endTime = selectedSlot.split(' - ')[1];
    setBusy(true);
    const response = await fetch(`/api/appointments/${appointment.id}/self-reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, date: selectedDate, startTime }),
    });
    const data = await response.json();
    setBusy(false);
    onDone(data.message, response.ok, response.ok ? { date: selectedDate, startTime, endTime } : undefined);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-200">Escolha uma nova data</p>
      <div className="flex flex-wrap gap-2">
        {dateOptions.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => setSelectedDate(date)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              selectedDate === date ? 'border-brand-500 bg-brand-500/10 text-brand-100' : 'border-white/10 bg-white/5 hover:border-brand-500'
            }`}
          >
            {formatDateLabel(date)}
          </button>
        ))}
      </div>

      {selectedDate ? (
        <>
          <p className="text-sm font-medium text-slate-200">Escolha um horário</p>
          <div className="flex flex-wrap gap-2">
            {loadingSlots ? <span className="text-sm text-slate-300">Buscando horários...</span> : null}
            {!loadingSlots && slots.length === 0 ? <span className="text-sm text-slate-300">Nenhum horário disponível nesse dia.</span> : null}
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  selectedSlot === slot ? 'border-brand-500 bg-brand-500/10 text-brand-100' : 'border-white/10 bg-white/5 hover:border-brand-500'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!selectedSlot || busy}
          onClick={confirmReschedule}
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? 'Enviando...' : 'Confirmar novo horário'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          Voltar
        </button>
      </div>
    </div>
  );
}
