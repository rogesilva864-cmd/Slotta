import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Evita que o Next tente pré-renderizar esta página no momento do build
// (quando o banco/volume ainda não está disponível) — os dados passam
// a ser buscados a cada requisição, em tempo real.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const companies = await prisma.company.findMany({
    include: {
      services: {
        where: { active: true },
        orderBy: { name: 'asc' },
        take: 3,
      },
      appointments: {
        include: { customer: true, service: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { name: 'asc' },
  });

  const stats = [
    { label: 'Serviços ativos', value: String(companies.reduce((total, company) => total + company.services.length, 0)) },
    { label: 'Agendamentos', value: String(companies.reduce((total, company) => total + company.appointments.length, 0)) },
    { label: 'Disponibilidade', value: '24/7' },
  ];

  return (
    <main className="min-h-screen px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="card premium-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-brand-100">Sistema SaaS</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Agendamento profissional para empresas</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/agendar/empresa-demo" className="btn-primary">Agendar agora</Link>
              <Link href="/cadastro" className="btn-secondary">Cadastrar empresa</Link>
              <Link href="/admin/login" className="btn-secondary">Painel admin</Link>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card stat-card">
              <p className="text-sm text-slate-300">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="card hero-card p-6 md:p-8">
            <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
              Visão geral
            </div>
            <h2 className="mt-5 max-w-xl text-4xl font-bold md:text-5xl">
              Plataforma inteligente para agendar serviços e vender mais.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
              A arquitetura foi pensada para múltiplas empresas, controle de disponibilidade, confirmação automática e gestão profissional do atendimento.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/agendar/empresa-demo" className="btn-primary">Ver página pública</Link>
              <Link href="/consultar" className="btn-secondary">Consultar agendamento</Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="feature-box">
                <p className="feature-title">Reservas rápidas</p>
                <p className="feature-text">Cliente escolhe serviço, data e horário em poucos cliques.</p>
              </div>
              <div className="feature-box">
                <p className="feature-title">Confirmação inteligente</p>
                <p className="feature-text">O dono da empresa recebe o pedido e confirma ou recusa.</p>
              </div>
              <div className="feature-box">
                <p className="feature-title">Multi-empresa</p>
                <p className="feature-text">Uma base pronta para atender vários clientes com branding próprio.</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-xl font-semibold">Próximos agendamentos</h3>
            <ul className="mt-4 space-y-3">
              {companies.flatMap((company) =>
                company.appointments.map((appointment) => (
                  <li key={appointment.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex justify-between gap-3">
                      <span>{appointment.startTime}</span>
                      <span className={`status-pill ${appointment.status === 'PENDING' ? 'status-pending' : 'status-confirmed'}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{appointment.customer.name}</p>
                    <p className="text-sm text-slate-300">{appointment.service.name} · {company.name}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

      </div>
    </main>
  );
}
