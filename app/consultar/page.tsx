'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

type AppointmentResult = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string };
  customer: { name: string; phone: string; email?: string | null };
};

export default function ConsultStatusPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AppointmentResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
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
            <p className="mt-2 text-2xl font-bold text-emerald-300">{result.status}</p>
            <p className="mt-3 text-sm text-slate-300">
              Serviço: {result.service.name} · Data: {result.date} · Horário: {result.startTime}
            </p>
            <div className="mt-4 text-sm text-slate-300">
              <p>Cliente: {result.customer.name}</p>
              <p>Contato: {result.customer.phone}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-slate-300">
          <Link href="/" className="text-brand-100 hover:underline">Voltar ao início</Link>
        </div>
      </div>
    </main>
  );
}
