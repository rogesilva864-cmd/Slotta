'use client';

import { useEffect, useState } from 'react';
import type { Appointment, NotificationItem } from '../types';
import { formatCurrency, formatDate, statusClass, statusLabel } from '../types';
import { QuickBlockCard } from '../quick-block-card';

export function DashboardPanel({ onNavigate }: { onNavigate: (tab: 'appointments' | 'calendar' | 'availability') => void }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      const [appointmentsResponse, notificationsResponse] = await Promise.all([
        fetch('/api/admin/appointments'),
        fetch('/api/notifications'),
      ]);

      const appointmentsData = await appointmentsResponse.json();
      const notificationsData = await notificationsResponse.json();

      if (!active) return;
      setAppointments(Array.isArray(appointmentsData.appointments) ? appointmentsData.appointments : []);
      setNotifications(Array.isArray(notificationsData.notifications) ? notificationsData.notifications : []);
      setLoading(false);
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const pending = appointments.filter((appointment) => appointment.status === 'PENDING').length;
  const isConfirmedOrDone = (status: string) => status === 'CONFIRMED' || status === 'COMPLETED';
  const confirmed = appointments.filter((appointment) => isConfirmedOrDone(appointment.status)).length;
  const billing = appointments
    .filter((appointment) => isConfirmedOrDone(appointment.status))
    .reduce((total, appointment) => total + appointment.price, 0);

  const cards = [
    { label: 'Total de agendamentos', value: String(appointments.length) },
    { label: 'Pendentes', value: String(pending) },
    { label: 'Confirmados', value: String(confirmed) },
    { label: 'Faturamento confirmado', value: formatCurrency(billing) },
  ];

  const recentAppointments = appointments.slice(0, 6);

  return (
    <div className="space-y-6">
      <QuickBlockCard onOpenAvailability={() => onNavigate('availability')} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card stat-card">
            <p className="text-sm text-slate-300">{card.label}</p>
            <p className="mt-3 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Agendamentos recentes</h2>
            <button type="button" onClick={() => onNavigate('appointments')} className="text-sm font-medium text-brand-100 hover:underline">
              Ver todos
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? <p className="text-sm text-slate-300">Carregando agendamentos...</p> : null}
            {!loading && recentAppointments.length === 0 ? (
              <p className="text-sm text-slate-300">Nenhum agendamento registrado.</p>
            ) : null}

            {recentAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong>{appointment.customer.name}</strong>
                  <span className={`status-pill ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {appointment.service.name} · {formatDate(appointment.date)} · {appointment.startTime} · {formatCurrency(appointment.price)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-xl font-semibold">Notificações</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {notifications.length === 0 ? <p>Nenhuma notificação.</p> : null}
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="font-medium text-white">{notification.title}</p>
                <p className="mt-1">{notification.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
