const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

type EmailContent = { to: string; subject: string; text: string; html: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail({ to, subject, text, html }: EmailContent) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM_ADDRESS;
  const senderName = process.env.EMAIL_FROM_NAME || 'Slotta';

  if (!apiKey || !senderEmail) {
    // Sem Brevo configurado (.env): não bloqueia o fluxo em desenvolvimento,
    // apenas registra no log do servidor para permitir testar.
    console.warn(`[mailer] BREVO_API_KEY/EMAIL_FROM_ADDRESS não configurados. E-mail "${subject}" para ${to} não enviado.\n${text}`);
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
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar e-mail via Brevo (${response.status}): ${body}`);
  }

  return { delivered: true as const };
}

function layout(title: string, bodyHtml: string, cta?: { url: string; label: string }) {
  return `
    <div style="background:#071320;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#edf4ff;">
      <div style="max-width:480px;margin:0 auto;background:#0d1826;border:1px solid rgba(148,178,255,0.2);border-radius:16px;padding:32px;">
        <p style="text-transform:uppercase;letter-spacing:0.2em;font-size:12px;color:#7dd3fc;margin:0 0 12px;">Slotta</p>
        <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(title)}</h1>
        ${bodyHtml}
        ${
          cta
            ? `<a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#2f7dff;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;font-size:14px;margin-top:8px;">${escapeHtml(cta.label)}</a>`
            : ''
        }
      </div>
    </div>
  `;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: 'Recupere o acesso ao seu painel Slotta',
    text: `Recebemos uma solicitação para redefinir a senha do seu painel Slotta.\n\nAcesse o link abaixo para criar uma nova senha (válido por 30 minutos):\n${resetUrl}\n\nSe você não solicitou isso, pode ignorar este e-mail com segurança.`,
    html: layout(
      'Redefinição de senha',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">Recebemos uma solicitação para redefinir a senha do seu painel administrativo. Clique no botão abaixo para criar uma nova senha. Este link expira em 30 minutos.</p>`,
      { url: resetUrl, label: 'Criar nova senha' }
    ) +
      `<p style="font-size:12px;line-height:1.6;color:#6f88ab;text-align:center;">Se você não solicitou essa alteração, pode ignorar este e-mail com segurança — sua senha atual continua válida.</p>`,
  });
}

export async function sendNewAppointmentEmail(
  to: string,
  data: { customerName: string; serviceName: string; date: string; startTime: string; panelUrl: string }
) {
  const line = `${data.customerName} pediu ${data.serviceName} para ${data.date} às ${data.startTime}.`;
  return sendEmail({
    to,
    subject: 'Novo pedido de agendamento no Slotta',
    text: `${line}\n\nConfirme ou recuse no painel:\n${data.panelUrl}`,
    html: layout(
      'Novo pedido de agendamento',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">${escapeHtml(line)}</p>`,
      { url: data.panelUrl, label: 'Abrir painel' }
    ),
  });
}

export async function sendReviewRequestEmail(
  to: string,
  data: { customerName: string; companyName: string; reviewUrl: string }
) {
  if (!data.reviewUrl.startsWith('https://')) {
    throw new Error('Link de avaliação inválido: precisa começar com https://');
  }

  return sendEmail({
    to,
    subject: `Como foi seu atendimento na ${data.companyName}?`,
    text: `Olá, ${data.customerName}! Obrigado por escolher a ${data.companyName}.\n\nSua opinião ajuda muito. Avalie em menos de 1 minuto:\n${data.reviewUrl}`,
    html: layout(
      'Como foi seu atendimento?',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">Olá, ${escapeHtml(data.customerName)}! Obrigado por escolher a <strong style="color:#edf4ff;">${escapeHtml(data.companyName)}</strong>. Sua opinião ajuda muito: leva menos de 1 minuto.</p>`,
      { url: data.reviewUrl, label: 'Avaliar agora' }
    ),
  });
}

export async function sendWaitlistAvailableEmail(
  to: string,
  data: { customerName: string; companyName: string; serviceName: string; date: string; bookingUrl: string }
) {
  const [year, month, day] = data.date.split('-');
  const when = `${day}/${month}/${year}`;
  const line = `Um horário de ${data.serviceName} abriu na ${data.companyName} para o dia ${when}.`;

  return sendEmail({
    to,
    subject: `Abriu um horário na ${data.companyName}!`,
    text: `Olá, ${data.customerName}!\n\nVocê estava na lista de espera. ${line}\nQuem reservar primeiro garante a vaga:\n${data.bookingUrl}`,
    html: layout(
      'Abriu um horário!',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 12px;">Olá, ${escapeHtml(data.customerName)}! Você estava na lista de espera.</p><p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">${escapeHtml(line)} Quem reservar primeiro garante a vaga.</p>`,
      { url: data.bookingUrl, label: 'Reservar meu horário' }
    ),
  });
}

export async function sendAppointmentCancelledEmail(
  to: string,
  data: { customerName: string; companyName: string; serviceName: string; date: string; startTime: string; reason: string; bookingUrl: string }
) {
  const [year, month, day] = data.date.split('-');
  const when = `${day}/${month}/${year} às ${data.startTime}`;
  const line = `Seu horário de ${data.serviceName} na ${data.companyName}, marcado para ${when}, precisou ser cancelado.`;

  return sendEmail({
    to,
    subject: `Seu horário na ${data.companyName} foi cancelado`,
    text: `Olá, ${data.customerName}!

${line}
Motivo: ${data.reason}

Pedimos desculpas pelo imprevisto. Para escolher um novo horário, acesse:
${data.bookingUrl}`,
    html: layout(
      'Seu horário foi cancelado',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 12px;">Olá, ${escapeHtml(data.customerName)}!</p><p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 12px;">${escapeHtml(line)}</p><p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;"><strong style="color:#edf4ff;">Motivo:</strong> ${escapeHtml(data.reason)}<br/>Pedimos desculpas pelo imprevisto.</p>`,
      { url: data.bookingUrl, label: 'Escolher novo horário' }
    ),
  });
}

export async function sendAppointmentCancelledByClientEmail(
  to: string,
  data: { customerName: string; serviceName: string; date: string; startTime: string; panelUrl: string }
) {
  const line = `${data.customerName} cancelou o horário de ${data.serviceName} marcado para ${data.date} às ${data.startTime}.`;
  return sendEmail({
    to,
    subject: 'Um cliente cancelou o agendamento',
    text: `${line}\n\nVeja no painel:\n${data.panelUrl}`,
    html: layout(
      'Cliente cancelou o agendamento',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">${escapeHtml(line)}</p>`,
      { url: data.panelUrl, label: 'Abrir painel' }
    ),
  });
}

export async function sendAppointmentRescheduledEmail(
  to: string,
  data: {
    customerName: string;
    serviceName: string;
    previousDate: string;
    previousStartTime: string;
    date: string;
    startTime: string;
    panelUrl: string;
  }
) {
  const line = `${data.customerName} remarcou o horário de ${data.serviceName}: de ${data.previousDate} às ${data.previousStartTime} para ${data.date} às ${data.startTime}. O pedido está pendente de confirmação.`;
  return sendEmail({
    to,
    subject: 'Um cliente remarcou o agendamento',
    text: `${line}\n\nConfirme ou recuse no painel:\n${data.panelUrl}`,
    html: layout(
      'Cliente remarcou o agendamento',
      `<p style="font-size:14px;line-height:1.6;color:#aac0dd;margin:0 0 24px;">${escapeHtml(line)}</p>`,
      { url: data.panelUrl, label: 'Abrir painel' }
    ),
  });
}

export async function sendDailyDigestEmail(
  to: string,
  data: { dateLabel: string; items: { time: string; customerName: string; serviceName: string; status: string }[]; panelUrl: string }
) {
  const text = [
    `Agenda de ${data.dateLabel}:`,
    ...data.items.map((item) => `${item.time} - ${item.customerName} (${item.serviceName}) [${item.status}]`),
    '',
    `Painel: ${data.panelUrl}`,
  ].join('\n');

  const rows = data.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#7dd3fc;font-weight:600;">${escapeHtml(item.time)}</td><td style="padding:6px 0;color:#edf4ff;">${escapeHtml(item.customerName)} <span style="color:#6f88ab;">· ${escapeHtml(item.serviceName)} · ${escapeHtml(item.status)}</span></td></tr>`
    )
    .join('');

  return sendEmail({
    to,
    subject: `Sua agenda de hoje: ${data.items.length} ${data.items.length === 1 ? 'horário' : 'horários'}`,
    text,
    html: layout(
      `Agenda de ${data.dateLabel}`,
      `<table style="font-size:14px;line-height:1.5;margin:0 0 24px;border-collapse:collapse;">${rows}</table>`,
      { url: data.panelUrl, label: 'Abrir painel' }
    ),
  });
}
