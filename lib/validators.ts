import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Senha mínima de 6 caracteres.'),
});

export const serviceSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  durationMinutes: z.number().int().min(10),
  active: z.boolean().optional(),
});

export const appointmentSchema = z.object({
  companyId: z.string().min(1),
  serviceId: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(25),
  email: z.string().email().max(150).optional().or(z.literal('')),
  date: z.string().min(1).max(10),
  startTime: z.string().min(1).max(5),
  notes: z.string().max(500).optional(),
});

export const registerSchema = z.object({
  companyName: z.string().min(2, 'Nome da empresa obrigatório.'),
  companyEmail: z.string().email('E-mail da empresa inválido.'),
  companyPhone: z.string().min(8, 'Telefone da empresa inválido.').optional().or(z.literal('')),
  companyDescription: z.string().max(500).optional().or(z.literal('')),
  slug: z.string().min(2, 'Slug inválido.').regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens.'),
  adminName: z.string().min(2, 'Nome do responsável obrigatório.'),
  adminEmail: z.string().email('E-mail do responsável inválido.'),
  password: z.string().min(6, 'Senha mínima de 6 caracteres.'),
  services: z.array(
    z.object({
      name: z.string().min(2, 'Nome do serviço obrigatório.'),
      description: z.string().max(500).optional().or(z.literal('')),
      price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a zero.'),
      durationMinutes: z.coerce.number().int().min(10, 'Duração mínima de 10 minutos.'),
    })
  ).min(1, 'Cadastre pelo menos um serviço.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Link inválido.'),
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
    confirmPassword: z.string().min(6, 'Confirme a nova senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export const availabilityQuerySchema = z.object({
  companyId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().min(1),
});
