import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validators';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 });
    }

    const {
      companyName,
      companyEmail,
      companyPhone,
      companyDescription,
      slug,
      adminName,
      adminEmail,
      password,
      services,
    } = parsed.data;

    const slugExists = await prisma.company.findUnique({ where: { slug } });
    if (slugExists) {
      return NextResponse.json({ message: 'Este endereço de empresa já está em uso.' }, { status: 409 });
    }

    const emailExists = await prisma.company.findUnique({ where: { email: companyEmail } });
    if (emailExists) {
      return NextResponse.json({ message: 'Já existe uma empresa com este e-mail.' }, { status: 409 });
    }

    const userExists = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (userExists) {
      return NextResponse.json({ message: 'Já existe um usuário com este e-mail.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: {
        name: companyName,
        email: companyEmail,
        phone: companyPhone || null,
        slug,
        description: companyDescription || null,
      },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    });

    await prisma.service.createMany({
      data: services.map((service) => ({
        companyId: company.id,
        name: service.name,
        description: service.description || null,
        price: Number(service.price),
        durationMinutes: Number(service.durationMinutes),
        active: true,
      })),
    });

    const token = signToken({
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: 'Empresa cadastrada com sucesso.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
          },
        },
      },
      { status: 201 }
    );

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: 'Não foi possível cadastrar a empresa.' }, { status: 500 });
  }
}
