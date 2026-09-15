import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date');

  if (!companyId || !serviceId || !date) {
    return NextResponse.json({ message: 'Parâmetros ausentes.' }, { status: 400 });
  }

  const slots = await getAvailableSlots(companyId, serviceId, date);
  return NextResponse.json({ slots });
}
