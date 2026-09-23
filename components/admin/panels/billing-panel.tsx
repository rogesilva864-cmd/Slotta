'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';

type Status = {
  planLabel: string;
  status: string;
  hasAccess: boolean;
  trialDaysLeft: number | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  trial: 'Em teste grátis',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  unpaid: 'Pagamento não realizado',
  incomplete: 'Pagamento incompleto',
  incomplete_expired: 'Pagamento expirado',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

export function BillingPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/billing/status')
      .then((response) => response.json())
      .then((data) => setStatus(data))
      .finally(() => setLoading(false));
  }, []);

  const goTo = async (endpoint: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setMessage(data.message || 'Não foi possível continuar.');
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setMessage('Não foi possível continuar. Verifique sua internet.');
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-300">Carregando assinatura...</p>;
  }

  if (!status) {
    return <p className="text-sm text-rose-300">Não foi possível carregar sua assinatura.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
            <CreditCard size={20} aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Assinatura</h2>
            <p className="mt-1 text-sm text-slate-300">{status.planLabel}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-400">Situação atual</p>
          <p className="mt-1 text-xl font-semibold">{STATUS_LABELS[status.status] ?? status.status}</p>

          {status.status === 'trial' && status.trialDaysLeft !== null ? (
            <p className="mt-2 text-sm text-amber-200">
              {status.trialDaysLeft > 0
                ? `Faltam ${status.trialDaysLeft} ${status.trialDaysLeft === 1 ? 'dia' : 'dias'} de teste grátis.`
                : 'Seu teste grátis termina hoje.'}
            </p>
          ) : null}

          {status.currentPeriodEnd && (status.status === 'active' || status.status === 'past_due') ? (
            <p className="mt-2 text-sm text-slate-300">Próxima cobrança: {formatDate(status.currentPeriodEnd)}</p>
          ) : null}

          {status.status === 'past_due' ? (
            <p className="mt-2 text-sm text-rose-300">O último pagamento falhou. Atualize a forma de pagamento para não perder o acesso.</p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {status.hasStripeCustomer ? (
            <button type="button" onClick={() => goTo('/api/admin/billing/portal')} disabled={busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
              {busy ? 'Abrindo...' : 'Gerenciar assinatura'}
            </button>
          ) : (
            <button type="button" onClick={() => goTo('/api/admin/billing/checkout')} disabled={busy} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
              {busy ? 'Abrindo...' : 'Assinar agora'}
            </button>
          )}
        </div>

        {message ? <p className="mt-4 text-sm text-rose-300">{message}</p> : null}
      </section>
    </div>
  );
}
