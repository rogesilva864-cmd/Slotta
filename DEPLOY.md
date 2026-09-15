# Deploy do Slotta (Railway)

Este guia coloca o projeto no ar de forma permanente, com um link público
fixo, mantendo o banco SQLite atual (sem precisar migrar para Postgres).

## 0. Pré-requisitos já prontos neste projeto

- Repositório git já inicializado e com o primeiro commit feito.
- `package.json` já preparado para produção:
  - `postinstall` roda `prisma generate` automaticamente após `npm install`.
  - `start` roda `prisma migrate deploy` antes de subir o servidor (aplica
    migrações pendentes no banco de produção a cada deploy).
- `.gitignore` já exclui `node_modules`, `.next`, `.env` e `prisma/dev.db`
  (o banco local de desenvolvimento nunca vai para o repositório).

## 1. Subir o código para o GitHub

1. Crie um repositório novo, **vazio** (sem README/gitignore), em
   https://github.com/new — por exemplo `slotta`.
2. No terminal, dentro da pasta `agendamento-saas-final`, rode:

   ```powershell
   git remote add origin https://github.com/SEU-USUARIO/slotta.git
   git push -u origin main
   ```

   Na primeira vez o Git vai pedir para você entrar com sua conta do
   GitHub pelo navegador — só seguir o fluxo normal.

## 2. Criar o projeto no Railway

1. Crie uma conta em https://railway.com (dá para entrar direto com GitHub).
2. **New Project → Deploy from GitHub repo** e selecione o repositório
   que você acabou de criar.
3. O Railway detecta automaticamente que é um projeto Node/Next.js.

## 3. Adicionar um volume para o banco de dados

Sem isso, o banco SQLite é apagado a cada novo deploy.

1. No serviço criado, vá em **Settings → Volumes → New Volume**.
2. Monte em `/data` (mount path).
3. Em **Variables**, defina:

   ```
   DATABASE_URL=file:/data/prod.db
   ```

## 4. Variáveis de ambiente

Ainda em **Variables**, adicione (o Railway já te dá o domínio gerado
em **Settings → Networking → Generate Domain**; use-o abaixo):

```
AUTH_SECRET=<gere um novo com o comando abaixo>
NEXTAUTH_URL=https://SEU-DOMINIO.up.railway.app
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.up.railway.app
```

Para gerar um `AUTH_SECRET` forte, rode localmente:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### E-mail de recuperação de senha (opcional, mas recomendado)

Sem isso, o "Esqueci minha senha" continua funcionando, mas o link cai
só no log do servidor (ninguém recebe e-mail). Se você tiver um SMTP
(Gmail com senha de app, Resend, SendGrid etc.), adicione:

```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM="Slotta <no-reply@seudominio.com>"
```

## 5. Popular o banco de produção (opcional)

Se quiser começar com a empresa de demonstração já cadastrada, rode uma
vez (Railway → aba **Shell** do serviço, ou via `railway run`):

```
npm run prisma:seed
```

Isso cria a empresa demo com login `admin@empresa-demo.com` / `admin123`
— **troque essa senha depois de publicar** (Configurações → Alterar
senha, dentro do próprio painel).

## 6. Pronto

O Railway builda (`npm run build`) e inicia (`npm run start`, que já
roda as migrações) automaticamente a cada push na branch `main`. O link
gerado em **Settings → Networking** é o que você compartilha.

### Depois de publicar, considere:

- Trocar a senha do admin demo (ou remover a empresa demo).
- Configurar um domínio próprio em **Settings → Networking → Custom Domain**.
- Configurar o SMTP se ainda não tiver feito, para o "esqueci minha senha"
  funcionar de verdade.
