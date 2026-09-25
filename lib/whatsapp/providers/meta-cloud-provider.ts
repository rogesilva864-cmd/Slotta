import type { WhatsappProvider, WhatsappSendRequest, WhatsappSendResult, WhatsappTemplateType } from '../types';

// Ordem dos parâmetros de corpo esperados por cada template aprovado no
// WhatsApp Business Manager (Meta). Ao criar os templates lá, use variáveis
// {{1}}, {{2}}, ... exatamente nessa ordem. Ver WHATSAPP_SETUP.md.
const TEMPLATE_PARAMETER_ORDER: Record<WhatsappTemplateType, string[]> = {
  APPOINTMENT_CONFIRMED: ['customerName', 'companyName', 'serviceName', 'date', 'startTime'],
  APPOINTMENT_REMINDER: ['customerName', 'companyName', 'serviceName', 'date', 'startTime', 'intervalLabel'],
  APPOINTMENT_CANCELLED: ['customerName', 'companyName', 'serviceName', 'date', 'startTime', 'reason'],
  REVIEW_REQUEST: ['customerName', 'companyName', 'reviewUrl'],
  WAITLIST_AVAILABLE: ['customerName', 'companyName', 'serviceName', 'date', 'bookingUrl'],
};

const TEMPLATE_ENV_VAR: Record<WhatsappTemplateType, string> = {
  APPOINTMENT_CONFIRMED: 'WHATSAPP_TEMPLATE_CONFIRMED',
  APPOINTMENT_REMINDER: 'WHATSAPP_TEMPLATE_REMINDER',
  APPOINTMENT_CANCELLED: 'WHATSAPP_TEMPLATE_CANCELLED',
  REVIEW_REQUEST: 'WHATSAPP_TEMPLATE_REVIEW',
  WAITLIST_AVAILABLE: 'WHATSAPP_TEMPLATE_WAITLIST',
};

const DEFAULT_TEMPLATE_NAME: Record<WhatsappTemplateType, string> = {
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  REVIEW_REQUEST: 'review_request',
  WAITLIST_AVAILABLE: 'waitlist_available',
};

/**
 * Integração com a API oficial do WhatsApp (Meta Cloud API).
 *
 * Requer, no .env de produção (ver WHATSAPP_SETUP.md para o passo a passo
 * completo de como obter cada valor):
 *
 *   WHATSAPP_PROVIDER=meta
 *   WHATSAPP_API_TOKEN=<token de acesso permanente do Meta Business>
 *   WHATSAPP_PHONE_NUMBER_ID=<ID do número de telefone no Cloud API>
 *   WHATSAPP_API_VERSION=v20.0                 (opcional)
 *   WHATSAPP_TEMPLATE_LANG=pt_BR                (opcional)
 *   WHATSAPP_TEMPLATE_CONFIRMED=appointment_confirmed
 *   WHATSAPP_TEMPLATE_REMINDER=appointment_reminder
 *   WHATSAPP_TEMPLATE_CANCELLED=appointment_cancelled
 *
 * Os três últimos precisam ser o *nome exato* de templates já aprovados no
 * WhatsApp Business Manager (mensagens proativas iniciadas pela empresa,
 * como confirmações e lembretes, exigem template aprovado — não é possível
 * enviar texto livre fora de uma janela de atendimento de 24h iniciada pelo
 * cliente).
 */
export class MetaCloudWhatsappProvider implements WhatsappProvider {
  name = 'meta';

  private get apiVersion() {
    return process.env.WHATSAPP_API_VERSION || 'v20.0';
  }

  private get language() {
    return process.env.WHATSAPP_TEMPLATE_LANG || 'pt_BR';
  }

  async send(request: WhatsappSendRequest): Promise<WhatsappSendResult> {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return { success: false, error: 'WhatsApp (Meta) não configurado: faltam WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID.' };
    }

    const templateEnvVar = TEMPLATE_ENV_VAR[request.templateType];
    const templateName = process.env[templateEnvVar] || DEFAULT_TEMPLATE_NAME[request.templateType];
    const parameterOrder = TEMPLATE_PARAMETER_ORDER[request.templateType];
    const parameters = parameterOrder.map((key) => ({ type: 'text', text: request.variables[key] || '-' }));

    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: request.to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: this.language },
            components: [{ type: 'body', parameters }],
          },
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error?.message || `Falha HTTP ${response.status} ao enviar WhatsApp.`;
        return { success: false, error: message };
      }

      const providerMessageId = data?.messages?.[0]?.id;
      return { success: true, providerMessageId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar WhatsApp.' };
    }
  }
}
