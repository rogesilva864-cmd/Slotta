import { notFound } from 'next/navigation';
import { BookingClient } from '@/components/booking-client';
import { prisma } from '@/lib/prisma';

export default async function CompanyBookingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { data?: string; servico?: string };
}) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
  });

  if (!company) {
    notFound();
  }

  const services = await prisma.service.findMany({
    where: { companyId: company.id, active: true },
    orderBy: { name: 'asc' },
  });

  const initialDate = typeof searchParams.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.data) ? searchParams.data : undefined;
  const initialServiceId = services.find((service) => service.id === searchParams.servico)?.id;

  return <BookingClient company={company} services={services} initialDate={initialDate} initialServiceId={initialServiceId} />;
}
