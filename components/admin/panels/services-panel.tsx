'use client';

import { useEffect, useState } from 'react';
import type { ServiceItem } from '../types';

const emptyForm = { name: '', description: '', price: '0', durationMinutes: '30' };

export function ServicesPanel() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    const response = await fetch('/api/admin/services');
    const data = await response.json();
    setServices(Array.isArray(data.services) ? data.services : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
      }),
    });

    if (response.ok) {
      setForm(emptyForm);
      await loadData();
    }
  };

  const startEdit = (service: ServiceItem) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      description: service.description ?? '',
      price: String(service.price),
      durationMinutes: String(service.durationMinutes),
    });
  };

  const saveEdit = async (id: string) => {
    const response = await fetch(`/api/admin/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
        price: Number(editForm.price),
        durationMinutes: Number(editForm.durationMinutes),
      }),
    });

    if (response.ok) {
      setEditingId(null);
      await loadData();
    }
  };

  const toggleActive = async (service: ServiceItem) => {
    const response = await fetch(`/api/admin/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !service.active }),
    });

    if (response.ok) {
      await loadData();
    }
  };

  const removeService = async (id: string) => {
    const response = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await loadData();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="card p-5">
        <h2 className="text-xl font-semibold">Serviços</h2>
        <div className="mt-4 space-y-3">
          {loading ? <p className="text-sm text-slate-300">Carregando serviços...</p> : null}
          {!loading && services.length === 0 ? <p className="text-sm text-slate-300">Nenhum serviço cadastrado.</p> : null}

          {services.map((service) => (
            <div key={service.id} className={`rounded-xl border p-4 ${service.active ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-60'}`}>
              {editingId === service.id ? (
                <div className="space-y-3">
                  <input
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
                    rows={2}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min="10"
                      step="5"
                      value={editForm.durationMinutes}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => saveEdit(service.id)} className="btn-primary text-sm">Salvar</button>
                    <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <strong>{service.name}</strong>
                    <span className="text-brand-100">R$ {Number(service.price).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{service.description || 'Sem descrição'}</p>
                  <p className="mt-2 text-xs text-slate-400">{service.durationMinutes} minutos · {service.active ? 'Ativo' : 'Inativo'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEdit(service)} className="btn-secondary text-sm">Editar</button>
                    <button type="button" onClick={() => toggleActive(service)} className="btn-secondary text-sm">
                      {service.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button type="button" onClick={() => removeService(service.id)} className="text-sm font-medium text-rose-300 hover:underline">
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-lg font-semibold">Novo serviço</h3>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
            placeholder="Nome do serviço"
            required
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
            placeholder="Descrição"
            rows={3}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
              placeholder="Preço"
              required
            />
            <input
              type="number"
              min="10"
              step="5"
              value={form.durationMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
              placeholder="Duração"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">Adicionar serviço</button>
        </form>
      </div>
    </div>
  );
}
