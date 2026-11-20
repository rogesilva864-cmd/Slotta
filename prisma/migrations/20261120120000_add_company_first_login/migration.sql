-- Primeiro login da empresa, para avisar o dono da plataforma uma única vez.
ALTER TABLE "Company" ADD COLUMN "firstLoginAt" DATETIME;

-- Empresas que já existiam não devem disparar o aviso "primeiro acesso" no
-- próximo login. A única exceção é a Luciana Alves, cadastrada em 20/11/2026
-- e que ainda não tinha entrado no painel quando este aviso foi criado.
UPDATE "Company" SET "firstLoginAt" = CURRENT_TIMESTAMP WHERE "slug" <> 'luciana-alves';
