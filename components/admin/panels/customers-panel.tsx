'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CustomerItem } from '../types';
import { formatDate, statusClass, statusLabel } from '../types';

export function CustomersPanel() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/admin/customers')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term) ||
        (customer.email ?? '').toLowerCase().includes(term)
    );
  }, [customers, search]);

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white sm:max-w-xs"
          placeholder="Buscar por nome, telefone ou e-mail"
        />
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <p className="text-sm text-slate-300">Carregando clientes...</p> : null}
        {!loading && filtered.length === 0 ? <p className="text-sm text-slate-300">Nenhum cliente encontrado.</p> : null}

        {filtered.map((customer) => {
          const isExpanded = expandedId === customer.id;
          return (
            <div key={customer.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              >
                <div>
                  <strong>{customer.name}</strong>
                  <p className="text-xs text-slate-400">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</p>
                </div>
                <div className="text-right text-sm text-slate-300">
                  <p>{customer.appointmentsCount} agendamento(s)</p>
                  {customer.lastAppointment ? (
                    <p className="text-xs text-slate-400">Último: {formatDate(customer.lastAppointment.date)}</p>
                  ) : null}
                </div>
              </button>

              {isExpanded && customer.lastAppointment ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>{customer.lastAppointment.serviceName}</span>
                    <span className={`status-pill ${statusClass(customer.lastAppointment.status)}`}>{statusLabel(customer.lastAppointment.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(customer.lastAppointment.date)} às {customer.lastAppointment.startTime}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
