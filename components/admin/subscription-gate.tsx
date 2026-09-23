'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';

export function SubscriptionGate({ companyName, planLabel }: { companyName: string; planLabel: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const subscribe = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/billing/checkout', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setMessage(data.message || 'Não foi possível iniciar o pagamento.');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setMessage('Não foi possível iniciar o pagamento. Verifique sua internet.');
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="card w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
          <Lock size={26} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Seu período de teste acabou</h1>
        <p className="mt-3 text-slate-300">
          Assine o Slotta para continuar usando o painel de <strong>{companyName}</strong>. A página pública de agendamento e os
          horários já marcados continuam funcionando normalmente.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Plano único</p>
          <p className="mt-2 text-3xl font-bold">{planLabel}</p>
          <p className="mt-2 text-sm text-slate-400">Cancele quando quiser, sem multa.</p>
        </div>

        <button type="button" onClick={subscribe} disabled={loading} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? 'Abrindo pagamento...' : 'Assinar agora'}
        </button>

        {message ? <p className="mt-3 text-sm text-rose-300">{message}</p> : null}

        <button type="button" onClick={logout} className="mt-4 text-sm text-slate-400 hover:underline">
          Sair da conta
        </button>
      </div>
    </main>
  );
}
