# Agendamento SaaS

Sistema profissional de agendamento online para empresas clientes.

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Zod
- NextAuth

## Instalação

1. Instale as dependências:
   npm install
2. Crie o arquivo .env a partir do .env.example e ajuste as variáveis.
3. Crie o banco PostgreSQL.
4. Rode:
   npx prisma generate
   npx prisma migrate dev
   npm run prisma:seed
5. Inicie o servidor:
   npm run dev

## Acesso administrativo

Use os dados seedados em `prisma/seed.ts` ou crie um usuário novo no painel.

## Estrutura

- app/
- components/
- lib/
- services/
- prisma/

## Funcionalidades

- agendamento público por empresa
- painel administrativo com login
- serviços, clientes, agendamentos e notificações
- controle de disponibilidade
- confirmação e rejeição de agendamentos
- consulta de status pelo cliente
- arquitetura pronta para multi-tenant
