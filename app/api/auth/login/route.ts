import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validators';
import { signToken } from '@/lib/auth';
import { getClientIp, peekRateLimit, recordHit, resetRateLimit, takeRateLimit, tooManyRequests } from '@/lib/rate-limit';

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_LIMIT = { limit: 8, windowMs: FAILURE_WINDOW_MS };
const IP_LIMIT = { limit: 40, windowMs: FAILURE_WINDOW_MS };
const BLOCKED_MESSAGE = 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipCheck = ip === 'unknown' ? { allowed: true, retryAfterSeconds: 0 } : takeRateLimit(`login:ip:${ip}`, IP_LIMIT);
    if (!ipCheck.allowed) {
      console.warn(`[rate-limit] Login bloqueado por excesso de tentativas do IP ${ip}.`);
      return tooManyRequests(BLOCKED_MESSAGE, ipCheck.retryAfterSeconds);
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // Com IP desconhecido não há como separar quem errou, então o bloqueio por falhas não se aplica.
    const failureKey = `login:fail:${ip}:${email.toLowerCase()}`;
    const trackFailures = ip !== 'unknown';
    const failureCheck = trackFailures ? peekRateLimit(failureKey, FAILURE_LIMIT) : { allowed: true, retryAfterSeconds: 0 };
    if (!failureCheck.allowed) return tooManyRequests(BLOCKED_MESSAGE, failureCheck.retryAfterSeconds);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      if (trackFailures) recordHit(failureKey, FAILURE_WINDOW_MS);
      return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      if (trackFailures) recordHit(failureKey, FAILURE_WINDOW_MS);
      return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
    }

    resetRateLimit(failureKey);

    const token = signToken({
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug,
        },
      },
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: 'Não foi possível realizar o login.' }, { status: 500 });
  }
}
