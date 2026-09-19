import Link from 'next/link';
import { BellRing, CalendarCheck, CheckCircle2, Link2, Search, Store } from 'lucide-react';

const steps = [
  { icon: Link2, title: 'Compartilhe seu link', text: 'Cada empresa ganha uma página própria de agendamento para divulgar onde quiser.' },
  { icon: CalendarCheck, title: 'Cliente escolhe o horário', text: 'Serviço, data e horário em poucos cliques, só com os horários que você deixou livres.' },
  { icon: CheckCircle2, title: 'Você confirma', text: 'O pedido chega no painel e você confirma ou recusa. O cliente é avisado.' },
];

const features = [
  { icon: BellRing, title: 'Lembretes por WhatsApp', text: 'Confirmação, lembrete antes do horário e aviso de cancelamento enviados automaticamente.' },
  { icon: Store, title: 'Feito para vários negócios', text: 'Serviços, duração, disponibilidade e dias de atendimento configurados por empresa.' },
  { icon: Search, title: 'Consulta do cliente', text: 'O cliente acompanha o status do agendamento sem precisar de conta.' },
];

export default function HomePage() {
  return (
    <main className="px-4 pb-16 pt-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="card hero-card p-6 text-center md:p-12">
          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Agende. Confirme. Organize.
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">
              Sua agenda cheia, <span className="gradient-text">sem troca de mensagens.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
              O Slotta recebe os agendamentos do seu negócio, organiza os horários e lembra seus clientes pelo WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/cadastro" className="btn-primary">Cadastrar minha empresa</Link>
              <Link href="/admin/login" className="btn-secondary">Entrar no painel</Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Já tem um agendamento? <Link href="/consultar" className="text-cyan-300 underline-offset-4 hover:underline">Consulte aqui</Link>
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Como funciona</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="feature-box">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-cyan-300">
                    <step.icon size={20} aria-hidden />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Passo {index + 1}</span>
                </div>
                <p className="mt-4 text-lg font-semibold">{step.title}</p>
                <p className="feature-text">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Tudo que você precisa para atender melhor</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="feature-box">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                  <feature.icon size={20} aria-hidden />
                </span>
                <p className="mt-4 text-lg font-semibold">{feature.title}</p>
                <p className="feature-text">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card mt-12 p-8 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Comece a receber agendamentos hoje</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">Cadastre sua empresa, configure seus serviços e horários e compartilhe o link com seus clientes.</p>
          <div className="mt-6 flex justify-center">
            <Link href="/cadastro" className="btn-primary">Cadastrar minha empresa</Link>
          </div>
        </section>

        <footer className="mt-10 text-center text-sm text-slate-500">© {new Date().getFullYear()} Slotta</footer>
      </div>
    </main>
  );
}
