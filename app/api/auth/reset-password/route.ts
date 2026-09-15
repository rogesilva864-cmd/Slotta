import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validators';
import { hashPasswordResetToken } from '@/lib/auth';

const INVALID_TOKEN_MESSAGE = 'Este link de recuperação é inválido ou já expirou. Solicite um novo.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const tokenHash = hashPasswordResetToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json({ message: INVALID_TOKEN_MESSAGE }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Qualquer outro link pendente para esse usuário também é invalidado.
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
      }),
    ]);

    return NextResponse.json({ message: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' });
  } catch (error) {
    console.error('[reset-password] Erro inesperado:', error);
    return NextResponse.json({ message: 'Não foi possível redefinir a senha. Tente novamente.' }, { status: 500 });
  }
}
