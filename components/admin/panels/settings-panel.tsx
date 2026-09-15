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
  );
}
