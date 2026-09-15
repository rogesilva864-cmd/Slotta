import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function getSessionUser() {
  const token = cookies().get('session_token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });

  if (!user || user.companyId !== payload.companyId) return null;

  return user;
}
