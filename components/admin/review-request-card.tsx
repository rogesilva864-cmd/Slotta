'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

type ReviewStats = { sent: number; failed: number; skipped: number };

const DELAY_LABELS: Record<number, string> = {
  60: '1 hora depois',
  120: '2 horas depois',
  240: '4 horas depois',
  1440: 'No dia seguinte (24 horas depois)',
};

export function ReviewRequestCard() {
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(120);
  const [delayOptions, setDelayOptions] = useState<number[]>([60, 120, 240, 1440]);
  const [stats, setStats] = useState<ReviewStats>({ sent: 0, failed: 0, skipped: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/reminders/settings');
      if (!response.ok) return;
      const data = await response.json();
      if (!data.review) return;
      setEnabled(Boolean(data.review.enabled));
      setUrl(data.review.url ?? '');
      setDelayMinutes(Number(data.review.delayMinutes) || 120);
      if (Array.isArray(data.review.delayOptions)) setDelayOptions(data.review.delayOptions);
      if (data.review.stats) setStats(data.review.stats);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/reminders/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: { enabled, url: url.trim(), delayMinutes } }),
      });
      const data = await response.json();
      setMessage({ ok: response.ok, text: response.ok ? 'Configuração de avaliações salva.' : data.message || 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
          <Star size={20} aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Pedir avaliação depois do atendimento</h2>
          <p className="mt-1 text-sm text-slate-300">
            Depois que o horário passa, o cliente recebe automaticamente um convite para avaliar sua empresa. Mais avaliações no Google trazem mais clientes novos.
          </p>
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Pedir avaliação automaticamente
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_1fr]">
        <label className="field">
          <span>Link para avaliar</span>
          <input
            type="url"
            inputMode="url"
            placeholder="https://g.page/r/.../review"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Quando enviar</span>
          <select value={delayMinutes} onChange={(event) => setDelayMinutes(Number(event.target.value))}>
            {delayOptions.map((option) => (
              <option key={option} value={option}>
                {DELAY_LABELS[option] ?? `${option} minutos depois`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="mt-3 text-sm text-slate-300">
        <summary className="cursor-pointer font-medium text-brand-100">Como encontrar o link de avaliação do Google?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-400">
          <li>Abra o Google Maps e procure pela sua empresa (é preciso ter o Perfil da Empresa no Google).</li>
          <li>Toque em <strong>Compartilhar</strong> ou, no Perfil da Empresa, em <strong>Pedir avaliações</strong>.</li>
          <li>Copie o link de avaliação e cole acima. Ele deve começar com https://.</li>
        </ol>
      </details>

      <p className="mt-4 text-sm text-slate-400">
        O convite vai por <strong>e-mail</strong>, quando o cliente informou um, e por <strong>WhatsApp</strong>, se os lembretes por WhatsApp estiverem ativados. Cada atendimento recebe no máximo um convite, só para atendimentos confirmados ou concluídos. Quem faltar: marque “Não compareceu” em Agendamentos antes do horário do convite para ele não ser enviado.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Últimos 30 dias: <span className="text-emerald-300">{stats.sent} enviados</span>
          {stats.failed > 0 ? <span className="text-rose-300"> · {stats.failed} com falha</span> : null}
          {stats.skipped > 0 ? <span> · {stats.skipped} sem canal (cliente sem e-mail)</span> : null}
        </p>
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {message ? <p className={`mt-3 text-sm ${message.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{message.text}</p> : null}
    </section>
  );
}
