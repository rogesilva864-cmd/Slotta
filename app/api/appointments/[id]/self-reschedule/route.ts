import { NextResponse } from 'next/server';
import { selfRescheduleSchema } from '@/lib/validators';
import { selfRescheduleAppointment } from '@/lib/appointments/self-service';
import { getClientIp, takeRateLimit, tooManyRequests } from '@/lib/rate-limit';

const IP_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };
const TARGET_LIMIT = { limit: 8, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ip = getClientIp(request);

  if (ip !== 'unknown') {
    const ipCheck = takeRateLimit(`self-reschedule:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) return tooManyRequests('Muitas tentativas. Tente novamente mais tarde.', ipCheck.retryAfterSeconds);
  }
  const targetCheck = takeRateLimit(`self-reschedule:target:${ip}:${params.id}`, TARGET_LIMIT);
  if (!targetCheck.allowed) return tooManyRequests('Muitas tentativas. Tente novamente mais tarde.', targetCheck.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const parsed = selfRescheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  }

  const result = await selfRescheduleAppointment({
    appointmentId: params.id,
    contact: parsed.data.contact,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json({ message: result.message });
}
