import { NextResponse } from 'next/server';
import { selfCancelSchema } from '@/lib/validators';
import { selfCancelAppointment } from '@/lib/appointments/self-service';
import { getClientIp, takeRateLimit, tooManyRequests } from '@/lib/rate-limit';

const IP_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };
const TARGET_LIMIT = { limit: 8, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const ip = getClientIp(request);

  if (ip !== 'unknown') {
    const ipCheck = takeRateLimit(`self-cancel:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) return tooManyRequests('Muitas tentativas. Tente novamente mais tarde.', ipCheck.retryAfterSeconds);
  }
  const targetCheck = takeRateLimit(`self-cancel:target:${ip}:${params.id}`, TARGET_LIMIT);
  if (!targetCheck.allowed) return tooManyRequests('Muitas tentativas. Tente novamente mais tarde.', targetCheck.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const parsed = selfCancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
  }

  const result = await selfCancelAppointment({ appointmentId: params.id, contact: parsed.data.contact });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json({ message: result.message });
}
