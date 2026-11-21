'use client';

import { useEffect, useState } from 'react';
import type { AdminCompany, AdminUser } from '../types';

export function SettingsPanel({ company, admin }: { company: AdminCompany; admin: AdminUser }) {
  const [companyForm, setCompanyForm] = useState({ companyName: '', companyPhone: '', companyDescription: '' });
  const [adminForm, setAdminForm] = useState({ adminName: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [minHours, setMinHours] = useState(0);
  const [minHoursSaving, setMinHoursSaving] = useState(false);
  const [minHoursMessage, setMinHoursMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/company')
      .then((response) => response.json())
      .then((data) => {
        if (!active || !data.company) return;
        setCompanyForm({
          companyName: data.company.name ?? '',
          companyPhone: data.company.phone ?? '',
          companyDescription: data.company.description ?? '',
        });
        setAdminForm({ adminName: data.admin?.name ?? '' });
        setAutoConfirm(data.company.autoConfirm === true);
        setMinHours(typeof data.company.selfServiceMinHours === 'number' ? data.company.selfServiceMinHours : 0);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/agendar/${company.slug}` : `/agendar/${company.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const payload: Record<string, string> = {
      companyName: companyForm.companyName,
      companyPhone: companyForm.companyPhone,
      companyDescription: companyForm.companyDescription,
      adminName: adminForm.adminName,
    };

    if (passwordForm.newPassword) {
      payload.currentPassword = passwordForm.currentPassword;
      payload.newPassword = passwordForm.newPassword;
    }

    const response = await fetch('/api/admin/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || 'Não foi possível salvar as alterações.');
      return;
    }

    setMessage(data.message || 'Alterações salvas com sucesso.');
    setPasswordForm({ currentPassword: '', newPassword: '' });
  };

  const saveAutoConfirm = async (value: boolean) => {
    if (value === autoConfirm || confirmSaving) return;
    const previous = autoConfirm;
    setAutoConfirm(value);
    setConfirmSaving(true);
    setConfirmMessage(null);
    try {
      const response = await fetch('/api/admin/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoConfirm: value }),
      });
      if (!response.ok) throw new Error();
      setConfirmMessage({
        ok: true,
        text: value
          ? 'Pronto! Os próximos agendamentos já entram confirmados.'
          : 'Pronto! Os próximos agendamentos vão esperar a sua confirmação.',
      });
    } catch {
      setAutoConfirm(previous);
      setConfirmMessage({ ok: false, text: 'Não foi possível salvar. Tente de novo.' });
    } finally {
      setConfirmSaving(false);
    }
  };

  const saveMinHours = async (value: number) => {
    if (value === minHours || minHoursSaving) return;
    const previous = minHours;
    setMinHours(value);
    setMinHoursSaving(true);
    setMinHoursMessage(null);
    try {
      const response = await fetch('/api/admin/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfServiceMinHours: value }),
      });
      if (!response.ok) throw new Error();
      setMinHoursMessage({
        ok: true,
        text: value
          ? `Pronto! Faltando menos de ${value}h, o cliente só consegue desmarcar falando com você pelo WhatsApp.`
          : 'Pronto! O cliente pode cancelar ou remarcar pelo link até a hora do atendimento.',
      });
    } catch {
      setMinHours(previous);
      setMinHoursMessage({ ok: false, text: 'Não foi possível salvar. Tente de novo.' });
    } finally {
      setMinHoursSaving(false);
    }
  };

  const minHoursOptions = [
    { value: 0, label: 'Sem limite' },
    { value: 2, label: '2 horas antes' },
    { value: 6, label: '6 horas antes' },
    { value: 12, label: '12 horas antes' },
    { value: 24, label: '24 horas antes' },
    { value: 48, label: '48 horas antes' },
  ];

  const confirmOptions = [
    {
      value: true,
      title: 'Confirmar automaticamente',
      text: 'O horário é confirmado na hora. O cliente recebe a confirmação e os lembretes sem você precisar fazer nada.',
    },
    {
      value: false,
      title: 'Eu confirmo cada pedido',
      text: 'Cada agendamento fica pendente até você confirmar ou recusar no painel. O horário fica reservado enquanto isso.',
    },
  ];

  if (loading) {
    return <p className="text-sm text-slate-300">Carregando configurações...</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={saveSettings} className="card space-y-6 p-5">
        <div>
          <h2 className="text-xl font-semibold">Dados da empresa</h2>
          <div className="mt-4 space-y-3">
            <label className="field">
              <span>Nome da empresa</span>
              <input
                value={companyForm.companyName}
                onChange={(event) => setCompanyForm((prev) => ({ ...prev, companyName: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                value={companyForm.companyPhone}
                onChange={(event) => setCompanyForm((prev) => ({ ...prev, companyPhone: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea
                rows={3}
                value={companyForm.companyDescription}
                onChange={(event) => setCompanyForm((prev) => ({ ...prev, companyDescription: event.target.value }))}
              />
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Conta do administrador</h2>
          <div className="mt-4 space-y-3">
            <label className="field">
              <span>Nome</span>
              <input
                value={adminForm.adminName}
                onChange={(event) => setAdminForm({ adminName: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input value={admin.email} disabled className="opacity-60" />
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Alterar senha</h2>
          <div className="mt-4 space-y-3">
            <label className="field">
              <span>Senha atual</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                placeholder="Necessária apenas para alterar a senha"
              />
            </label>
            <label className="field">
              <span>Nova senha</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="Mínimo de 6 caracteres"
              />
            </label>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
        {message ? <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">{message}</div> : null}

        <button type="submit" className="btn-primary w-full">Salvar alterações</button>
      </form>

      <div className="space-y-6">
      <div className="card p-5">
        <h2 className="text-xl font-semibold">Confirmação dos agendamentos</h2>
        <p className="mt-2 text-sm text-slate-300">Escolha o que acontece quando um cliente agenda pela sua página.</p>
        <div className="mt-4 space-y-3" role="radiogroup" aria-label="Confirmação dos agendamentos">
          {confirmOptions.map((option) => {
            const selected = autoConfirm === option.value;
            return (
              <button
                key={option.title}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={confirmSaving}
                onClick={() => saveAutoConfirm(option.value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  selected ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-white/10 bg-slate-950/40 hover:border-white/25'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-cyan-400' : 'border-slate-500'
                  }`}
                  aria-hidden
                >
                  {selected ? <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> : null}
                </span>
                <span>
                  <span className="block font-semibold">{option.title}</span>
                  <span className="mt-1 block text-sm text-slate-300">{option.text}</span>
                </span>
              </button>
            );
          })}
        </div>
        {confirmMessage ? (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm ${
              confirmMessage.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {confirmMessage.text}
          </div>
        ) : null}
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-semibold">Prazo para o cliente desmarcar</h2>
        <p className="mt-2 text-sm text-slate-300">
          Até quando o cliente pode cancelar ou remarcar sozinho pelo link. Depois desse prazo, ele vê uma mensagem para falar com você pelo WhatsApp.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Prazo para o cliente desmarcar">
          {minHoursOptions.map((option) => {
            const selected = minHours === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={minHoursSaving}
                onClick={() => saveMinHours(option.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  selected ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-slate-950/40 hover:border-white/25'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {minHoursMessage ? (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm ${
              minHoursMessage.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            {minHoursMessage.text}
          </div>
        ) : null}
      </div>

      <div className="card p-5">
        <h2 className="text-xl font-semibold">Página pública de agendamento</h2>
        <p className="mt-2 text-sm text-slate-300">Compartilhe este link com seus clientes para que eles possam agendar diretamente.</p>
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <code className="break-all text-sm text-cyan-200">{publicUrl}</code>
          <button type="button" onClick={copyLink} className="btn-secondary text-sm">
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
