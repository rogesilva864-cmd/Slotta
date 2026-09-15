import { notFound } from 'next/navigation';
import { BookingClient } from '@/components/booking-client';
import { prisma } from '@/lib/prisma';

export default async function CompanyBookingPage({ params }: { params: { slug: string } }) {
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

  return <BookingClient company={company} services={services} />;
}
