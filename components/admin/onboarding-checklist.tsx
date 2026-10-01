'use client';

import { useState } from 'react';
import { Check, Circle, Clock, BellRing, Share2 } from 'lucide-react';

export type OnboardingStatus = {
  availabilityConfigured: boolean;
  pushActive: boolean;
  hasBooking: boolean;
  bookingUrl: string;
};

export function OnboardingChecklist({
  onboarding,
  onNavigate,
}: {
  onboarding: OnboardingStatus;
  onNavigate: (tab: 'availability' | 'reminders') => void;
}) {
  const [copied, setCopied] = useState(false);

  if (onboarding.availabilityConfigured && onboarding.pushActive && onboarding.hasBooking) {
    return null;
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(onboarding.bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const steps = [
    {
      done: onboarding.availabilityConfigured,
      icon: Clock,
      title: 'Configure seus horários de atendimento',
      description: 'Sem isso, seus clientes não conseguem agendar nenhum horário.',
      action: { label: 'Configurar disponibilidade', onClick: () => onNavigate('availability') },
    },
    {
      done: onboarding.pushActive,
      icon: BellRing,
      title: 'Ative as notificações no seu celular',
      description: 'Receba um alerta a cada novo pedido de agendamento, para não perder nenhum cliente.',
      action: { label: 'Ativar notificações', onClick: () => onNavigate('reminders') },
    },
    {
      done: onboarding.hasBooking,
      icon: Share2,
      title: 'Compartilhe sua página de agendamento',
      description: 'Envie o link para seus clientes pelo WhatsApp, Instagram ou onde preferir.',
      action: { label: copied ? 'Link copiado!' : 'Copiar link', onClick: copyLink },
    },
  ];

  return (
    <section className="card p-5 md:p-6">
      <h2 className="text-lg font-semibold">Primeiros passos</h2>
      <p className="mt-1 text-sm text-slate-300">Finalize essa configuração para aproveitar o Slotta ao máximo.</p>

      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
              step.done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}>
                {step.done ? <Check size={14} /> : <Circle size={14} />}
              </span>
              <div>
                <p className={`font-medium ${step.done ? 'text-emerald-200 line-through decoration-emerald-500/40' : 'text-white'}`}>{step.title}</p>
                <p className="mt-1 text-sm text-slate-400">{step.description}</p>
              </div>
            </div>
            {!step.done ? (
              <button type="button" onClick={step.action.onClick} className="btn-secondary shrink-0">
                {step.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
