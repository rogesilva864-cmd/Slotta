'use client';

import { useEffect, useState } from 'react';
import type { Appointment } from '../types';
import { formatCurrency, formatDate, statusClass } from '../types';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'CONFIRMED', label: 'Confirmados' },
  { key: 'REJECTED', label: 'Rejeitados' },
];

export function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'ALL') params.set('status', status);

    const response = await fetch(`/api/admin/appointments${params.toString() ? `?${params.toString()}` : ''}`);
    const data = await response.json();
    setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(loadData, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const updateStatus = async (appointmentId: string, action: 'confirm' | 'reject') => {
    setPendingAction(appointmentId);
    const response = await fetch(`/api/appointments/${appointmentId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reject' ? { reason: 'Solicitação rejeitada pelo administrador.' } : {}),
    });

    if (response.ok) {
      await loadData();
    }
    setPendingAction(null);
  };

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Agendamentos</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white sm:max-w-xs"
          placeholder="Buscar por cliente, telefone ou código"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setStatus(filter.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              status === filter.key
                ? 'border-brand-500 bg-brand-500/10 text-brand-100'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-brand-500'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-slate-300">Carregando agendamentos...</p> : null}
        {!loading && appointments.length === 0 ? <p className="text-sm text-slate-300">Nenhum agendamento encontrado.</p> : null}

        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>{appointment.customer.name}</strong>
                <p className="text-xs text-slate-400">{appointment.customer.phone}{appointment.customer.email ? ` · ${appointment.customer.email}` : ''}</p>
              </div>
              <span className={`status-pill ${statusClass(appointment.status)}`}>{appointment.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {appointment.service.name} · {formatDate(appointment.date)} · {appointment.startTime} - {appointment.endTime} · {formatCurrency(appointment.price)}
            </p>
            {appointment.notes ? <p className="mt-1 text-xs text-slate-400">Obs: {appointment.notes}</p> : null}
            {appointment.status === 'REJECTED' && appointment.rejectionReason ? (
              <p className="mt-1 text-xs text-rose-300">Motivo: {appointment.rejectionReason}</p>
            ) : null}

            {appointment.status === 'PENDING' ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={pendingAction === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'confirm')}
                  className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  disabled={pendingAction === appointment.id}
                  onClick={() => updateStatus(appointment.id, 'reject')}
                  className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Rejeitar
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
