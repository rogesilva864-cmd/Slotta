import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { AdminApp } from '@/components/admin/admin-app';

export default async function AdminPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect('/admin/login');
  }

  return (
    <AdminApp
      company={{
        id: sessionUser.company.id,
        name: sessionUser.company.name,
        slug: sessionUser.company.slug,
      }}
      admin={{
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
      }}
    />
  );
}
