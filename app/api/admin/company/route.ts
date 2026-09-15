import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  return NextResponse.json({
    company: {
      id: sessionUser.company.id,
      name: sessionUser.company.name,
      email: sessionUser.company.email,
      phone: sessionUser.company.phone,
      description: sessionUser.company.description,
      slug: sessionUser.company.slug,
    },
    admin: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
    },
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const companyData: Record<string, unknown> = {};
    const userData: Record<string, unknown> = {};

    if (typeof body.companyName === 'string' && body.companyName.trim()) {
      companyData.name = body.companyName.trim();
    }
    if (typeof body.companyPhone === 'string') {
      companyData.phone = body.companyPhone.trim() || null;
    }
    if (typeof body.companyDescription === 'string') {
      companyData.description = body.companyDescription.trim() || null;
    }
    if (typeof body.adminName === 'string' && body.adminName.trim()) {
      userData.name = body.adminName.trim();
    }

    if (body.newPassword) {
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

      if (newPassword.length < 6) {
        return NextResponse.json({ message: 'A nova senha deve ter ao menos 6 caracteres.' }, { status: 400 });
      }

      const matches = await bcrypt.compare(currentPassword, sessionUser.passwordHash);
      if (!matches) {
        return NextResponse.json({ message: 'Senha atual incorreta.' }, { status: 401 });
      }

      userData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(companyData).length > 0) {
      await prisma.company.update({ where: { id: sessionUser.companyId }, data: companyData });
    }
    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: sessionUser.id }, data: userData });
    }

    const company = await prisma.company.findUnique({ where: { id: sessionUser.companyId } });
    const admin = await prisma.user.findUnique({ where: { id: sessionUser.id } });

    return NextResponse.json({
      message: 'Informações atualizadas com sucesso.',
      company: company
        ? { id: company.id, name: company.name, email: company.email, phone: company.phone, description: company.description, slug: company.slug }
        : null,
      admin: admin ? { id: admin.id, name: admin.name, email: admin.email } : null,
    });
  } catch {
    return NextResponse.json({ message: 'Não foi possível salvar as alterações.' }, { status: 500 });
  }
}
