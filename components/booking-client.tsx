'use client';

import { useEffect, useMemo, useState } from 'react';

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
};

type Company = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export function BookingClient({ company, services }: { company: Company; services: Service[] }) {
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    notes: '',
  });

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? services[0],
    [selectedServiceId, services]
  );

  const dateOptions = useMemo(() => {
    const dates: string[] = [];
    const start = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
  }, []);

  useEffect(() => {
    if (!selectedServiceId || !selectedDate) {
      setSlots([]);
      setSelectedTime('');
      return;
    }

    const controller = new AbortController();
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/availability?companyId=${company.id}&serviceId=${selectedServiceId}&date=${selectedDate}`,
          { signal: controller.signal }
        );

        const data = await response.json();
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setSelectedTime('');
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => controller.abort();
  }, [company.id, selectedDate, selectedServiceId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedService || !selectedDate || !selectedTime) {
      setMessage('Selecione um serviço, uma data e um horário disponíveis.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        serviceId: selectedService.id,
        customerName: form.customerName,
        phone: form.phone,
        email: form.email,
        date: selectedDate,
        startTime: selectedTime.split(' - ')[0],
        notes: form.notes,
      }),
    });

    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(data.message || 'Não foi possível criar o agendamento.');
      return;
    }

    setMessage('Agendamento solicitado com sucesso! O dono da empresa receberá a confirmação.');
    setForm({ customerName: '', phone: '', email: '', notes: '' });
    setSelectedTime('');
    setSelectedDate(dateOptions[0]);
  };

  const selectedEndTime = selectedService && selectedTime ? selectedTime.split(' - ')[1] : null;

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="card p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">{company.name}</p>
              <h1 className="mt-2 text-3xl font-bold">Agende seu horário</h1>
              {company.description ? <p className="mt-2 text-slate-300">{company.description}</p> : null}
            </div>
            <a href="/" className="btn-secondary">Voltar</a>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-5">
            <h2 className="text-xl font-semibold">1. Escolha o serviço</h2>
            <div className="mt-4 grid gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedServiceId === service.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10 bg-white/5 hover:border-brand-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{service.name}</p>
                      <p className="mt-1 text-sm text-slate-300">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-brand-100">R$ {service.price.toFixed(2).replace('.', ',')}</p>
                      <p className="text-xs text-slate-300">{service.durationMinutes} min</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <h2 className="mt-6 text-xl font-semibold">2. Escolha a data</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {dateOptions.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`rounded-full border px-4 py-2 font-medium ${
                    selectedDate === date
                      ? 'border-brand-500 bg-brand-500/10 text-brand-100'
                      : 'border-white/10 bg-white/5 hover:border-brand-500'
                  }`}
                >
                  {new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </button>
              ))}
            </div>

            <h2 className="mt-6 text-xl font-semibold">3. Escolha o horário</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {loadingSlots ? (<span className="text-slate-300">Buscando horários disponíveis...</span>) : null}
              {!loadingSlots && slots.length === 0 && selectedDate ? (
                <span className="text-slate-300">Nenhum horário disponível para esse dia.</span>
              ) : null}
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  className={`rounded-full border px-4 py-2 font-medium ${
                    selectedTime === slot
                      ? 'border-brand-500 bg-brand-500/10 text-brand-100'
                      : 'border-white/10 bg-white/5 hover:border-brand-500'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <aside className="card p-5">
            <h2 className="text-xl font-semibold">Resumo do agendamento</h2>
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
              <div className="flex justify-between"><span>Serviço</span><strong>{selectedService?.name ?? 'Selecione'}</strong></div>
              <div className="flex justify-between"><span>Duração</span><strong>{selectedService ? `${selectedService.durationMinutes} min` : '--'}</strong></div>
              <div className="flex justify-between"><span>Valor</span><strong>{selectedService ? `R$ ${selectedService.price.toFixed(2).replace('.', ',')}` : '--'}</strong></div>
              <div className="flex justify-between"><span>Data</span><strong>{selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR') : '--'}</strong></div>
              <div className="flex justify-between"><span>Horário</span><strong>{selectedTime ?? '--'}</strong></div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="field">
                <span>Nome completo</span>
                <input type="text" autoComplete="name" value={form.customerName} onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))} placeholder="Seu nome completo" required />
              </label>

              <label className="field">
                <span>Telefone / WhatsApp</span>
                <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="(11) 99999-9999" required />
              </label>

              <label className="field">
                <span>
                  E-mail <span className="font-normal text-cyan-300">(recomendado)</span>
                </span>
                <input type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="seu@email.com" />
                <span className="text-xs font-normal text-slate-400">
                  Enviamos a confirmação do horário e avisamos você por aqui caso haja algum imprevisto.
                </span>
              </label>

              <label className="field">
                <span>Observação</span>
                <textarea rows={4} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Descreva sua necessidade..." />
              </label>

              {message ? (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                  {message}
                </div>
              ) : null}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? 'Solicitando...' : 'Solicitar agendamento'}
              </button>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
