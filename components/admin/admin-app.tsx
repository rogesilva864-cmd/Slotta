'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Scissors,
  Users,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import type { AdminCompany, AdminUser } from './types';
import { DashboardPanel } from './panels/dashboard-panel';
import { AppointmentsPanel } from './panels/appointments-panel';
import { CalendarPanel } from './panels/calendar-panel';
import { ServicesPanel } from './panels/services-panel';
import { CustomersPanel } from './panels/customers-panel';
import { AvailabilityPanel } from './panels/availability-panel';
import { SettingsPanel } from './panels/settings-panel';

type TabKey = 'dashboard' | 'appointments' | 'calendar' | 'services' | 'customers' | 'availability' | 'settings';

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'appointments', label: 'Agendamentos', icon: ClipboardList },
  { key: 'calendar', label: 'Calendário', icon: CalendarDays },
  { key: 'services', label: 'Serviços', icon: Scissors },
  { key: 'customers', label: 'Clientes', icon: Users },
  { key: 'availability', label: 'Disponibilidade', icon: Clock },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

export function AdminApp({ company, admin }: { company: AdminCompany; admin: AdminUser }) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeTab)?.label ?? '';

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-slate-900/80 p-5 lg:flex">
          <SidebarContent
            company={company}
            admin={admin}
            activeTab={activeTab}
            onSelect={selectTab}
            onLogout={handleLogout}
          />
        </aside>

        {/* Drawer (mobile/tablet) */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/70" onClick={() => setDrawerOpen(false)} />
            <aside className="relative z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-slate-900/95 p-5">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
              <SidebarContent
                company={company}
                admin={admin}
                activeTab={activeTab}
                onSelect={selectTab}
                onLogout={handleLogout}
              />
            </aside>
          </div>
        ) : null}

        {/* Content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-4 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{company.name}</p>
                <h1 className="text-xl font-bold lg:text-2xl">{activeLabel}</h1>
              </div>
            </div>
            <a
              href={`/agendar/${company.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 sm:inline-flex"
            >
              <ExternalLink size={16} /> Página pública
            </a>
          </header>

          <div className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            {activeTab === 'dashboard' ? <DashboardPanel onNavigate={selectTab} /> : null}
            {activeTab === 'appointments' ? <AppointmentsPanel /> : null}
            {activeTab === 'calendar' ? <CalendarPanel /> : null}
            {activeTab === 'services' ? <ServicesPanel /> : null}
            {activeTab === 'customers' ? <CustomersPanel /> : null}
            {activeTab === 'availability' ? <AvailabilityPanel /> : null}
            {activeTab === 'settings' ? <SettingsPanel company={company} admin={admin} /> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function SidebarContent({
  company,
  admin,
  activeTab,
  onSelect,
  onLogout,
}: {
  company: AdminCompany;
  admin: AdminUser;
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <img src="/logo-agenda.jpeg" alt="Logo" className="h-11 w-11 rounded-xl object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{company.name}</p>
          <p className="truncate text-xs text-slate-400">{admin.email}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeTab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-500/15 text-brand-100 ring-1 ring-brand-500/40'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
        <a
          href={`/agendar/${company.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          <ExternalLink size={18} /> Página pública
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
        >
          <LogOut size={18} /> Sair
        </button>
      </div>
    </>
  );
}
