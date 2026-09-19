'use client';

import { useEffect, useState } from 'react';
import type { Appointment } from '../types';
import { formatCurrency, formatDate, statusClass, statusLabel } from '../types';
import { CANCEL_REASON_DEFAULT, ManualContactList, channelLabel, requestCancel, type ManualContact } from '../cancel-helpers';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'CONFIRMED', label: 'Confirmados' },
  { key: 'COMPLETED', label: 'Concluídos' },
  { key: 'NO_SHOW', label: 'Faltas' },
  { key: 'CANCELLED', label: 'Cancelados' },
  { key: 'REJECTED', label: 'Rejeitados' },
];

function canBeCancelled(appointment: Appointment) {
  return appointment.status === 'CONFIRMED' && new Date(`${appointment.date}T${appointment.endTime}:00-03:00`).getTime() > Date.now();
}

const ATTENDANCE_STATUSES = ['CONFIRMED', 'COMPLETED', 'NO_SHOW'];

function hasStarted(appointment: Appointment) {
  return new Date(`${appointment.date}T${appointment.startTime}:00-03:00`).getTime() <= Date.now();
}

export function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [manualContacts, setManualContacts] = useState<ManualContact[]>([]);

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

  const confirmCancel = async (appointment: Appointment) => {
    setPendingAction(appointment.id);
    setNotice(null);
    setManualContacts([]);
    const outcome = await requestCancel(appointment.id, cancelReason.trim() || CANCEL_REASON_DEFAULT);

    if (!outcome.ok) {
      setNotice(outcome.message);
    } else if (outcome.needsManualContact) {
      setNotice(`Agendamento de ${outcome.customerName} cancelado, mas o Slotta não conseguiu avisar o cliente.`);
      setManualContacts([{ name: appointment.customer.name, phone: appointment.customer.phone, date: appointment.date, startTime: appointment.startTime }]);
    } else {
      setNotice(`Agendamento de ${outcome.customerName} cancelado. Cliente avisado por ${channelLabel(outcome.notifiedBy)}.`);
    }

    setCancelingId(null);
    setCancelReason('');
    if (outcome.ok) await loadData();
    setPendingAction(null);
  };

  const registerAttendance = async (appointmentId: string, attendance: 'COMPLETED' | 'NO_SHOW') => {
    setPendingAction(appointmentId);
    setNotice(null);
    const response = await fetch(`/api/admin/appointments/${appointmentId}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: attendance }),
    });
    const data = await response.json();
    setNotice(data.message ?? null);
    if (response.ok) await loadData();
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

      {notice ? <p className="mt-3 text-sm text-cyan-200" role="status">{notice}</p> : null}
      <ManualContactList contacts={manualContacts} />

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
              <span className={`status-pill ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {appointment.service.name} · {formatDate(appointment.date)} · {appointment.startTime} - {appointment.endTime} · {formatCurrency(appointment.price)}
            </p>
            {appointment.notes ? <p className="mt-1 text-xs text-slate-400">Obs: {appointment.notes}</p> : null}
            {(appointment.status === 'REJECTED' || appointment.status === 'CANCELLED') && appointment.rejectionReason ? (
              <p className="mt-1 text-xs text-rose-300">Motivo: {appointment.rejectionReason}</p>
            ) : null}

            {canBeCancelled(appointment) ? (
              cancelingId === appointment.id ? (
                <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  <label className="field">
                    <span>Motivo (o cliente vai ver)</span>
                    <input
                      type="text"
                      maxLength={200}
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder={CANCEL_REASON_DEFAULT}
                    />
                  </label>
                  <p className="text-xs text-slate-400">O cliente será avisado por WhatsApp (se ativado) e por e-mail (se ele informou um).</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pendingAction === appointment.id}
                      onClick={() => confirmCancel(appointment)}
                      className="btn-primary !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar e avisar o cliente
                    </button>
                    <button type="button" onClick={() => setCancelingId(null)} className="btn-secondary !px-4 !py-2 text-sm">
                      Voltar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelingId(appointment.id);
                      setCancelReason('');
                    }}
                    className="btn-secondary !px-4 !py-2 text-sm"
                  >
                    Cancelar agendamento
                  </button>
                </div>
              )
            ) : null}

            {ATTENDANCE_STATUSES.includes(appointment.status) && hasStarted(appointment) ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">O cliente veio?</span>
                <button
                  type="button"
                  disabled={pendingAction === appointment.id || appointment.status === 'COMPLETED'}
                  onClick={() => registerAttendance(appointment.id, 'COMPLETED')}
                  className="btn-secondary !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Compareceu
                </button>
                <button
                  type="button"
                  disabled={pendingAction === appointment.id || appointment.status === 'NO_SHOW'}
                  onClick={() => registerAttendance(appointment.id, 'NO_SHOW')}
                  className="btn-secondary !px-4 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Não compareceu
                </button>
              </div>
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
