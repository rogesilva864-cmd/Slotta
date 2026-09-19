import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { cancelAppointmentAndNotify } from '@/lib/appointments/cancel';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason : undefined;

  const result = await cancelAppointmentAndNotify({ appointmentId: params.id, companyId: sessionUser.companyId, reason });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({
    message: 'Agendamento cancelado.',
    customerName: result.customerName,
    customerPhone: result.customerPhone,
    notifiedBy: result.notifiedBy,
    needsManualContact: result.needsManualContact,
  });
}
