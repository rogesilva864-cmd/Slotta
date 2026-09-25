import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/availability';
import { isWaitlistOpen } from '@/lib/waitlist/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date');

  if (!companyId || !serviceId || !date) {
    return NextResponse.json({ message: 'Parâmetros ausentes.' }, { status: 400 });
  }

  const slots = await getAvailableSlots(companyId, serviceId, date);
  const waitlistOpen = slots.length === 0 ? await isWaitlistOpen(companyId, serviceId, date) : false;
  return NextResponse.json({ slots, waitlistOpen });
}
