'use client';

import { useEffect, useState } from 'react';
import type { NotificationItem } from '../types';
import { formatCurrency, formatDate, statusClass, statusLabel } from '../types';
import { QuickBlockCard } from '../quick-block-card';

type RecentAppointment = {
  id: string;
  date: string;
  startTime: string;
  price: number;
  status: string;
  service: { name: string };
  customer: { name: string };
};

type DashboardData = {
  totalAppointments: number;
  pending: number;
  confirmed: number;
  billingThisMonth: number;
  recentAppointments: RecentAppointment[];
};

const EMPTY_DASHBOARD: DashboardData = { totalAppointments: 0, pending: 0, confirmed: 0, billingThisMonth: 0, recentAppointments: [] };

export function DashboardPanel({ onNavigate }: { onNavigate: (tab: 'appointments' | 'calendar' | 'availability') => void }) {
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      const [dashboardResponse, notificationsResponse] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/notifications'),
      ]);

      const dashboardData = await dashboardResponse.json();
      const notificationsData = await notificationsResponse.json();

      if (!active) return;
      setDashboard({
        totalAppointments: dashboardData.totalAppointments ?? 0,
        pending: dashboardData.pending ?? 0,
        confirmed: dashboardData.confirmed ?? 0,
        billingThisMonth: dashboardData.billingThisMonth ?? 0,
        recentAppointments: Array.isArray(dashboardData.recentAppointments) ? dashboardData.recentAppointments : [],
      });
      setNotifications(Array.isArray(notificationsData.notifications) ? notificationsData.notifications : []);
      setLoading(false);
    };

    loadData();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  const cards = [
    { label: 'Total de agendamentos', value: String(dashboard.totalAppointments) },
    { label: 'Pendentes', value: String(dashboard.pending) },
    { label: 'Confirmados', value: String(dashboard.confirmed) },
    { label: `Faturamento de ${monthLabel}`, value: formatCurrency(dashboard.billingThisMonth) },
  ];

  return (
    <div className="space-y-6">
      <QuickBlockCard onOpenAvailability={() => onNavigate('availability')} onChanged={() => setRefreshKey((key) => key + 1)} />

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
            {!loading && dashboard.recentAppointments.length === 0 ? (
              <p className="text-sm text-slate-300">Nenhum agendamento registrado.</p>
            ) : null}

            {dashboard.recentAppointments.map((appointment) => (
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
