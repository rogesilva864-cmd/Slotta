const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM_ADDRESS;
  const senderName = process.env.EMAIL_FROM_NAME || 'Slotta';

  if (!apiKey || !senderEmail) {
    // Sem Brevo configurado (.env): não bloqueia o fluxo em desenvolvimento,
    // apenas registra o link no log do servidor para permitir testar.
    console.warn(`[mailer] BREVO_API_KEY/EMAIL_FROM_ADDRESS não configurados. Link de recuperação para ${to}: ${resetUrl}`);
    return { delivered: false as const };
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: 'Recupere o acesso ao seu painel Slotta',
      textContent: `Recebemos uma solicitação para redefinir a senha do seu painel Slotta.\n\nAcesse o link abaixo para criar uma nova senha (válido por 30 minutos):\n${resetUrl}\n\nSe você não solicitou isso, pode ignorar este e-mail com segurança.`,
      htmlContent: `
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
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar e-mail via Brevo (${response.status}): ${body}`);
  }

  return { delivered: true as const };
}
