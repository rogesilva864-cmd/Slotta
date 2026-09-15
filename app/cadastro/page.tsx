'use client';

import Link from 'next/link';
import { useState } from 'react';

type ServiceDraft = {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
};

const initialService: ServiceDraft = {
  name: '',
  description: '',
  price: '0',
  durationMinutes: '30',
};

export default function CompanyRegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [services, setServices] = useState<ServiceDraft[]>([initialService]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateService = (index: number, field: keyof ServiceDraft, value: string) => {
    setServices((current) =>
      current.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, [field]: value } : service
      )
    );
  };

  const addService = () => {
    setServices((current) => [...current, { ...initialService }]);
  };

  const removeService = (index: number) => {
    setServices((current) => current.filter((_, serviceIndex) => serviceIndex !== index));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyEmail,
          companyPhone,
          companyDescription,
          slug,
          adminName,
          adminEmail,
          password,
          services: services.map((service) => ({
            name: service.name,
            description: service.description,
            price: Number(service.price),
            durationMinutes: Number(service.durationMinutes),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Não foi possível cadastrar a empresa.');
        setIsSubmitting(false);
        return;
      }

      setMessage(`Empresa cadastrada com sucesso! Acesse o painel com ${data.user.email}.`);
      setCompanyName('');
      setCompanyEmail('');
      setCompanyPhone('');
      setCompanyDescription('');
      setSlug('');
      setAdminName('');
      setAdminEmail('');
      setPassword('');
      setServices([initialService]);
      setIsSubmitting(false);
    } catch {
      setError('Não foi possível conectar com o servidor.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="card p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Cadastro</p>
              <h1 className="mt-2 text-3xl font-bold">Cadastre sua empresa</h1>
            </div>
            <Link href="/" className="btn-secondary">Voltar ao início</Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Nome da empresa</span>
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
              </label>

              <label className="field">
                <span>E-mail da empresa</span>
                <input type="email" value={companyEmail} onChange={(event) => setCompanyEmail(event.target.value)} required />
              </label>

              <label className="field">
                <span>Telefone</span>
                <input value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} />
              </label>

              <label className="field">
                <span>Slug da página</span>
                <input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="minha-empresa" required />
              </label>
            </section>

            <label className="field">
              <span>Descrição da empresa</span>
              <textarea rows={3} value={companyDescription} onChange={(event) => setCompanyDescription(event.target.value)} />
            </label>

            <section className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Nome do responsável</span>
                <input value={adminName} onChange={(event) => setAdminName(event.target.value)} required />
              </label>

              <label className="field">
                <span>E-mail do responsável</span>
                <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required />
              </label>
            </section>

            <label className="field">
              <span>Senha de acesso</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
            </label>

            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Serviços</h2>
                <button type="button" onClick={addService} className="btn-secondary text-sm">+ Adicionar</button>
              </div>

              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-medium">Serviço {index + 1}</p>
                      {services.length > 1 ? (
                        <button type="button" onClick={() => removeService(index)} className="text-sm text-rose-300 hover:underline">
                          Remover
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="field">
                        <span>Nome</span>
                        <input value={service.name} onChange={(event) => updateService(index, 'name', event.target.value)} required />
                      </label>

                      <label className="field">
                        <span>Preço</span>
                        <input type="number" min="0" step="0.01" value={service.price} onChange={(event) => updateService(index, 'price', event.target.value)} required />
                      </label>

                      <label className="field md:col-span-2">
                        <span>Descrição</span>
                        <textarea rows={2} value={service.description} onChange={(event) => updateService(index, 'description', event.target.value)} />
                      </label>

                      <label className="field">
                        <span>Duração (minutos)</span>
                        <input type="number" min="10" step="5" value={service.durationMinutes} onChange={(event) => updateService(index, 'durationMinutes', event.target.value)} required />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div>
            ) : null}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar empresa'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
