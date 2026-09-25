import { NextResponse } from 'next/server';
import { waitlistSchema } from '@/lib/validators';
import { joinWaitlist } from '@/lib/waitlist/service';
import { getClientIp, takeRateLimit, tooManyRequests } from '@/lib/rate-limit';

const IP_LIMIT = { limit: 15, windowMs: 60 * 60 * 1000 };
const PHONE_LIMIT = { limit: 8, windowMs: 60 * 60 * 1000 };
const COMPANY_LIMIT = { limit: 80, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipCheck = ip === 'unknown' ? { allowed: true, retryAfterSeconds: 0 } : takeRateLimit(`waitlist:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) {
      return tooManyRequests('Muitas tentativas. Tente novamente mais tarde.', ipCheck.retryAfterSeconds);
    }

    const parsed = waitlistSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
    }

    const { companyId, phone } = parsed.data;
    const phoneCheck = takeRateLimit(`waitlist:phone:${companyId}:${phone.replace(/\D/g, '')}`, PHONE_LIMIT);
    const companyCheck = takeRateLimit(`waitlist:company:${companyId}`, COMPANY_LIMIT);
    const blocked = !phoneCheck.allowed ? phoneCheck : !companyCheck.allowed ? companyCheck : null;
    if (blocked) {
      return tooManyRequests('Muitas tentativas. Tente novamente mais tarde.', blocked.retryAfterSeconds);
    }

    const result = await joinWaitlist(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    return NextResponse.json({ message: result.message, alreadyOnList: result.alreadyOnList }, { status: result.alreadyOnList ? 200 : 201 });
  } catch (error) {
    console.error('[waitlist] Falha ao entrar na lista:', error);
    return NextResponse.json({ message: 'Não foi possível entrar na lista de espera.' }, { status: 500 });
  }
}
