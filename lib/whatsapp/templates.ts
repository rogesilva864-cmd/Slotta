import type { WhatsappTemplateType } from './types';

// Templates de texto usados pelo provider de console (desenvolvimento) e como
// fallback para provedores baseados em texto livre. Para a Meta Cloud API em
// produção, o texto final é definido pelo template aprovado no WhatsApp
// Business Manager — essas strings servem de referência para o conteúdo e
// para os parâmetros que devem ser enviados.

export function renderWhatsappTemplate(templateType: WhatsappTemplateType, variables: Record<string, string>): string {
  switch (templateType) {
    case 'APPOINTMENT_CONFIRMED':
      return (
        `✅ *Agendamento confirmado!*\n\n` +
        `Olá, ${variables.customerName}! Seu horário na *${variables.companyName}* foi confirmado.\n\n` +
        `Serviço: ${variables.serviceName}\n` +
        `Data: ${variables.date}\n` +
        `Horário: ${variables.startTime}\n\n` +
        `Qualquer imprevisto, entre em contato conosco.`
      );

    case 'APPOINTMENT_REMINDER':
      return (
        `⏰ *Lembrete de agendamento*\n\n` +
        `Olá, ${variables.customerName}! Passando para lembrar do seu horário na *${variables.companyName}*.\n\n` +
        `Serviço: ${variables.serviceName}\n` +
        `Data: ${variables.date}\n` +
        `Horário: ${variables.startTime}\n\n` +
        `${variables.intervalLabel}. Até lá!`
      );

    case 'APPOINTMENT_CANCELLED':
      return (
        `❌ *Agendamento cancelado*\n\n` +
        `Olá, ${variables.customerName}. Seu horário na *${variables.companyName}* foi cancelado.\n\n` +
        `Serviço: ${variables.serviceName}\n` +
        `Data: ${variables.date}\n` +
        `Horário: ${variables.startTime}\n` +
        (variables.reason ? `Motivo: ${variables.reason}\n` : '') +
        `\nSe quiser reagendar, é só acessar nossa página de agendamento.`
      );

    case 'REVIEW_REQUEST':
      return (
        `⭐ *Como foi seu atendimento?*\n\n` +
        `Olá, ${variables.customerName}! Obrigado por escolher a *${variables.companyName}*. ` +
        `Sua opinião ajuda muito: avalie em menos de 1 minuto pelo link abaixo.\n\n` +
        `${variables.reviewUrl}`
      );

    case 'WAITLIST_AVAILABLE':
      return (
        `🔔 *Abriu um horário!*\n\n` +
        `Olá, ${variables.customerName}! Você estava na lista de espera da *${variables.companyName}* e um horário de ${variables.serviceName} ` +
        `abriu para o dia ${variables.date}. Quem reservar primeiro garante a vaga:\n\n` +
        `${variables.bookingUrl}\n\nCorra, esses horários costumam sair rápido!`
      );

    default:
      return '';
  }
}
