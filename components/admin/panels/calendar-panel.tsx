'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '../types';
import { formatCurrency, statusClass, statusLabel } from '../types';

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/admin/appointments')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const list = map.get(appointment.date) ?? [];
      list.push(appointment);
      map.set(appointment.date, list);
    }
    return map;
  }, [appointments]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { day: number | null; dateKey: string | null }[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null, dateKey: null });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, dateKey: toDateKey(year, month, day) });

  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const selectedAppointments = (appointmentsByDate.get(selectedDate) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold capitalize">{monthLabel}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {WEEKDAY_SHORT.map((label) => (
            <div key={label} className="py-1">{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (!cell.day || !cell.dateKey) {
              return <div key={`empty-${index}`} />;
            }

            const dayAppointments = appointmentsByDate.get(cell.dateKey) ?? [];
            const isSelected = cell.dateKey === selectedDate;
            const isToday = cell.dateKey === new Date().toISOString().slice(0, 10);

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDate(cell.dateKey as string)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/15 text-brand-100'
                    : isToday
                    ? 'border-cyan-400/40 bg-cyan-500/5 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-brand-500'
                }`}
              >
                <span>{cell.day}</span>
                {dayAppointments.length > 0 ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                ) : null}
              </button>
            );
          })}
        </div>
        {loading ? <p className="mt-3 text-xs text-slate-400">Carregando agendamentos...</p> : null}
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-semibold">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </h2>
        <div className="mt-4 space-y-3">
          {selectedAppointments.length === 0 ? (
            <p className="text-sm text-slate-300">Nenhum agendamento para este dia.</p>
          ) : null}
          {selectedAppointments.map((appointment) => (
            <div key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <strong>{appointment.startTime}</strong>
                <span className={`status-pill ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{appointment.service.name} · {appointment.customer.name}</p>
              <p className="mt-1 text-xs text-slate-400">{formatCurrency(appointment.price)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
