import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validators';
import { createPasswordResetToken, hashPasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/mailer';

const GENERIC_MESSAGE = 'Se este e-mail estiver cadastrado, enviaremos um link de recuperação em instantes.';
const TOKEN_TTL_MINUTES = 30;
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'E-mail inválido.' }, { status: 400 });
    }

    const { email } = parsed.data;

    // Nunca revela se o e-mail existe ou não: sempre a mesma resposta genérica.
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const lastToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      const withinCooldown =
        lastToken && Date.now() - lastToken.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000;

      if (!withinCooldown) {
        // Invalida links anteriores ainda válidos para que apenas o mais recente funcione.
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        });

        const rawToken = createPasswordResetToken();
        const tokenHash = hashPasswordResetToken(rawToken);
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

        await prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash, expiresAt },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const resetUrl = `${baseUrl}/admin/login?token=${rawToken}`;

        try {
          await sendPasswordResetEmail(user.email, resetUrl);
        } catch (error) {
          console.error('[forgot-password] Falha ao enviar e-mail de recuperação:', error);
        }
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    // Mesmo em erro inesperado, não diferencia a resposta para não vazar informação.
    console.error('[forgot-password] Erro inesperado:', error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
