export type Appointment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  price: number;
  notes?: string | null;
  rejectionReason?: string | null;
  customer: { name: string; phone: string; email?: string | null };
  service: { name: string };
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
};

export type ServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes: number;
  active: boolean;
};

export type CustomerItem = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
  appointmentsCount: number;
  lastAppointment: {
    date: string;
    startTime: string;
    status: string;
    serviceName: string;
  } | null;
};

export type BusinessHourItem = {
  id: string;
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  active: boolean;
};

export type BlockedTimeItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
};

export type AdminCompany = {
  id: string;
  name: string;
  slug: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
};

export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

/** Link do WhatsApp (wa.me) para o dono avisar um cliente por conta própria. */
export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '');
  const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
  NO_SHOW: 'Não compareceu',
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function statusClass(status: string) {
  switch (status) {
    case 'PENDING':
      return 'status-pending';
    case 'CONFIRMED':
      return 'status-confirmed';
    case 'REJECTED':
      return 'status-rejected';
    case 'COMPLETED':
      return 'status-completed';
    case 'NO_SHOW':
      return 'status-rejected';
    default:
      return 'status-cancelled';
  }
}
