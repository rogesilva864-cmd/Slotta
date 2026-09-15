import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      name: 'Empresa Demo',
      email: 'contato@empresa-demo.com',
      phone: '(11) 99999-9999',
      slug: 'empresa-demo',
      description: 'Empresa fictícia para demonstração do sistema.',
    },
  });

  const secondCompany = await prisma.company.upsert({
    where: { slug: 'beauty-lab' },
    update: {},
    create: {
      name: 'Beauty Lab',
      email: 'contato@beauty-lab.com',
      phone: '(11) 98888-1234',
      slug: 'beauty-lab',
      description: 'Estética premium com agendamento exclusivo por serviço.',
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@empresa-demo.com' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Administrador Demo',
      email: 'admin@empresa-demo.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const secondAdmin = await prisma.user.upsert({
    where: { email: 'admin@beauty-lab.com' },
    update: {},
    create: {
      companyId: secondCompany.id,
      name: 'Administrador Beauty Lab',
      email: 'admin@beauty-lab.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const services = [
    { name: 'Corte de cabelo', description: 'Corte moderno e acabamento premium.', price: 40, durationMinutes: 30 },
    { name: 'Barba', description: 'Barba modelada com acabamento preciso.', price: 30, durationMinutes: 20 },
    { name: 'Corte + Barba', description: 'Pacote completo com corte e barba.', price: 60, durationMinutes: 50 },
  ];

  for (const service of services) {
    const existingService = await prisma.service.findFirst({
      where: {
        companyId: company.id,
        name: service.name,
      },
    });

    if (existingService) {
      await prisma.service.update({
        where: { id: existingService.id },
        data: {
          description: service.description,
          price: service.price,
          durationMinutes: service.durationMinutes,
          active: true,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          companyId: company.id,
          name: service.name,
          description: service.description,
          price: service.price,
          durationMinutes: service.durationMinutes,
          active: true,
        },
      });
    }
  }

  const secondServices = [
    { name: 'Alisamento capilar', description: 'produtos originais', price: 60, durationMinutes: 30 },
    { name: 'Hidratação profunda', description: 'nutrição intensa e reparação', price: 55, durationMinutes: 40 },
    { name: 'Manicure premium', description: 'acabamento sofisticado', price: 45, durationMinutes: 35 },
  ];

  for (const service of secondServices) {
    const existingService = await prisma.service.findFirst({
      where: {
        companyId: secondCompany.id,
        name: service.name,
      },
    });

    if (existingService) {
      await prisma.service.update({
        where: { id: existingService.id },
        data: {
          description: service.description,
          price: service.price,
          durationMinutes: service.durationMinutes,
          active: true,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          companyId: secondCompany.id,
          name: service.name,
          description: service.description,
          price: service.price,
          durationMinutes: service.durationMinutes,
          active: true,
        },
      });
    }
  }

  const customer = await prisma.customer.upsert({
    where: {
      id: 'customer-demo',
    },
    update: {},
    create: {
      id: 'customer-demo',
      companyId: company.id,
      name: 'João da Silva',
      phone: '(11) 98888-7777',
      email: 'joao@email.com',
    },
  });

  const businessDays = [
    { dayOfWeek: 1, openingTime: '09:00', closingTime: '18:00' },
    { dayOfWeek: 2, openingTime: '09:00', closingTime: '18:00' },
    { dayOfWeek: 3, openingTime: '09:00', closingTime: '18:00' },
    { dayOfWeek: 4, openingTime: '09:00', closingTime: '18:00' },
    { dayOfWeek: 5, openingTime: '09:00', closingTime: '18:00' },
    { dayOfWeek: 6, openingTime: '10:00', closingTime: '16:00' },
  ];

  for (const schedule of businessDays) {
    await prisma.businessHour.upsert({
      where: {
        id: `${company.id}-${schedule.dayOfWeek}`,
      },
      update: {
        openingTime: schedule.openingTime,
        closingTime: schedule.closingTime,
        active: true,
      },
      create: {
        id: `${company.id}-${schedule.dayOfWeek}`,
        companyId: company.id,
        dayOfWeek: schedule.dayOfWeek,
        openingTime: schedule.openingTime,
        closingTime: schedule.closingTime,
        active: true,
      },
    });
  }

  const serviceList = await prisma.service.findMany({
    where: { companyId: company.id },
  });

  const bookingService = serviceList[0];

  if (bookingService) {
    await prisma.appointment.upsert({
      where: { id: 'demo-appointment' },
      update: {},
      create: {
        id: 'demo-appointment',
        companyId: company.id,
        serviceId: bookingService.id,
        customerId: customer.id,
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        startTime: '14:00',
        endTime: '14:30',
        price: bookingService.price,
        status: 'PENDING',
        notes: 'Primeiro agendamento de teste.',
      },
    });
  }

  console.log('Seed concluído com sucesso');
  console.log({ company, admin, secondCompany, secondAdmin });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
