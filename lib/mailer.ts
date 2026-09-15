import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host || !user || !pass) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const transporter = getTransporter();

  if (!transporter) {
    // Sem SMTP configurado (.env): não bloqueia o fluxo em desenvolvimento,
    // apenas registra o link no log do servidor para permitir testar.
    console.warn(`[mailer] SMTP não configurado. Link de recuperação para ${to}: ${resetUrl}`);
    return { delivered: false as const };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Slotta" <no-reply@slotta.app>',
    to,
    subject: 'Recupere o acesso ao seu painel Slotta',
    text: `Recebemos uma solicitação para redefinir a senha do seu painel Slotta.\n\nAcesse o link abaixo para criar uma nova senha (válido por 30 minutos):\n${resetUrl}\n\nSe você não solicitou isso, pode ignorar este e-mail com segurança.`,
    html: `
      <div style="background:#071320;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#edf4ff;">
        <div style="max-width:480px;margin:0 auto;background:#0d1826;border:1px solid rgba(148,178,255,0.2);border-radius:16px;padding:32px;">
          <p style="text-transform:uppercase;letter-spacing:0.2em;font-size:12px;color:#7dd3fc;margin:0 0 12px;">Slotta</p>
          <h1 style="font-size:22px;margin:0 0 16px;">Redefinição de senha</h1>
          <p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">
            Recebemos uma solicitação para redefinir a senha do seu painel administrativo. Clique no botão abaixo para criar uma nova senha. Este link expira em 30 minutos.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#2f7dff;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;font-size:14px;">
            Criar nova senha
          </a>
          <p style="font-size:12px;line-height:1.6;color:#6f88ab;margin:24px 0 0;">
            Se você não solicitou essa alteração, pode ignorar este e-mail com segurança — sua senha atual continua válida.
          </p>
        </div>
      </div>
    `,
  });

  return { delivered: true as const };
}
